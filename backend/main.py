
from pathlib import Path
from io import BytesIO
import base64
import tempfile
import uuid
import subprocess

import cv2
import imageio_ffmpeg
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from PIL import Image, UnidentifiedImageError
from ultralytics import YOLO


app = FastAPI(title="VISIONAI Object Detection API")


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


MODEL_PATH = Path(__file__).resolve().parent / "yolo11n.pt"
OUTPUT_DIR = Path(__file__).resolve().parent / "outputs"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

app.mount(
    "/outputs",
    StaticFiles(directory=str(OUTPUT_DIR)),
    name="outputs",
)


model = None

INFERENCE_IMAGE_SIZE = 960
MAX_IMAGE_SIZE = 15 * 1024 * 1024
MAX_VIDEO_SIZE = 100 * 1024 * 1024
MAX_VIDEO_FRAMES = 1800


def get_model():
    global model

    if model is None:
        model = YOLO(
            str(MODEL_PATH) if MODEL_PATH.exists() else "yolo11n.pt"
        )

    return model


@app.get("/")
def home():
    return {
        "message": "VISIONAI Object Detection API is running",
        "docs": "/docs",
        "features": ["image_detection", "video_tracking"],
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "VISIONAI",
    }


# ---------------------------------------------------------
# IMAGE DETECTION
# ---------------------------------------------------------

@app.post("/detect")
async def detect_image(
    file: UploadFile = File(...),
    confidence: float = 0.35,
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=415,
            detail="Please upload an image file such as JPG or PNG.",
        )

    contents = await file.read()

    if len(contents) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Maximum image size is 15 MB.",
        )

    try:
        image = Image.open(BytesIO(contents)).convert("RGB")
    except (UnidentifiedImageError, OSError):
        raise HTTPException(
            status_code=400,
            detail="The uploaded image is invalid.",
        )

    confidence = max(0.05, min(float(confidence), 0.95))

    try:
        results = get_model().predict(
            source=image,
            conf=confidence,
            imgsz=INFERENCE_IMAGE_SIZE,
            verbose=False,
        )

        result = results[0]

        annotated = result.plot()
        annotated_image = Image.fromarray(annotated[:, :, ::-1])

        buffer = BytesIO()
        annotated_image.save(buffer, format="JPEG", quality=90)

        encoded_image = base64.b64encode(
            buffer.getvalue()
        ).decode("ascii")

        detections = []

        for box in result.boxes:
            class_id = int(box.cls[0].item())
            score = float(box.conf[0].item())

            coordinates = [
                round(float(value), 2)
                for value in box.xyxy[0].tolist()
            ]

            detections.append({
                "class_id": class_id,
                "label": result.names[class_id],
                "confidence": round(score, 4),
                "box": coordinates,
            })

        counts = {}

        for detection in detections:
            label = detection["label"]
            counts[label] = counts.get(label, 0) + 1

        mean_confidence = (
            round(
                sum(d["confidence"] for d in detections)
                / len(detections),
                4,
            )
            if detections
            else 0.0
        )

        return {
            "success": True,
            "filename": file.filename,
            "total_objects": len(detections),
            "counts": counts,
            "detections": detections,
            "annotated_image": (
                f"data:image/jpeg;base64,{encoded_image}"
            ),
            "image_width": image.width,
            "image_height": image.height,
            "model": "YOLO11n",
            "confidence_threshold": confidence,
            "inference_image_size": INFERENCE_IMAGE_SIZE,
            "mean_confidence": mean_confidence,
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=(
                f"Detection failed: {type(exc).__name__}: {exc}"
            ),
        ) from exc


# ---------------------------------------------------------
# VIDEO TRACKING + H.264 BROWSER-COMPATIBLE OUTPUT
# ---------------------------------------------------------

@app.post("/track-video")
async def track_video(
    file: UploadFile = File(...),
    confidence: float = 0.35,
):
    filename = file.filename or "video.mp4"
    suffix = Path(filename).suffix.lower()

    if suffix not in {".mp4", ".avi", ".mov", ".mkv"}:
        raise HTTPException(
            status_code=415,
            detail="Upload an MP4, AVI, MOV, or MKV video.",
        )

    contents = await file.read()

    if not contents:
        raise HTTPException(
            status_code=400,
            detail="The video is empty.",
        )

    if len(contents) > MAX_VIDEO_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Maximum video upload size is 100 MB.",
        )

    confidence = max(0.05, min(float(confidence), 0.95))

    output_name = f"tracked_{uuid.uuid4().hex}.mp4"
    output_path = OUTPUT_DIR / output_name

    converted_path = (
        OUTPUT_DIR / f"converted_{uuid.uuid4().hex}.mp4"
    )

    try:
        # Save the uploaded video temporarily.
        with tempfile.TemporaryDirectory() as temp_dir:
            input_path = Path(temp_dir) / f"input{suffix}"
            input_path.write_bytes(contents)

            capture = cv2.VideoCapture(str(input_path))

            if not capture.isOpened():
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Could not open this video. "
                        "Try another MP4."
                    ),
                )

            fps = capture.get(cv2.CAP_PROP_FPS)

            if not fps or fps <= 0 or fps > 240:
                fps = 25.0

            width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))

            if width <= 0 or height <= 0:
                capture.release()

                raise HTTPException(
                    status_code=400,
                    detail="The video has invalid dimensions.",
                )

            # Create the temporary tracking output.
            writer = cv2.VideoWriter(
                str(output_path),
                cv2.VideoWriter_fourcc(*"mp4v"),
                fps,
                (width, height),
            )

            if not writer.isOpened():
                capture.release()

                raise HTTPException(
                    status_code=500,
                    detail="Could not create the output video.",
                )

            tracked_ids = set()
            class_by_id = {}
            frame_detection_counts = {}
            processed_frames = 0

            try:
                while processed_frames < MAX_VIDEO_FRAMES:
                    success, frame = capture.read()

                    if not success:
                        break

                    results = get_model().track(
                        source=frame,
                        persist=True,
                        tracker="bytetrack.yaml",
                        conf=confidence,
                        imgsz=INFERENCE_IMAGE_SIZE,
                        verbose=False,
                    )

                    result = results[0]
                    annotated_frame = result.plot()

                    if result.boxes is not None:
                        for box in result.boxes:
                            class_id = int(box.cls[0].item())
                            label = result.names[class_id]

                            frame_detection_counts[label] = (
                                frame_detection_counts.get(label, 0) + 1
                            )

                            if (
                                box.id is not None
                                and box.id.numel() > 0
                            ):
                                track_id = int(box.id[0].item())

                                tracked_ids.add(track_id)
                                class_by_id[track_id] = label

                    writer.write(annotated_frame)
                    processed_frames += 1

            finally:
                capture.release()
                writer.release()

            if processed_frames == 0:
                raise HTTPException(
                    status_code=400,
                    detail="No readable video frames were found.",
                )

        # Convert MP4V output to H.264 for browser compatibility.
        ffmpeg_path = imageio_ffmpeg.get_ffmpeg_exe()

        conversion = subprocess.run(
            [
                ffmpeg_path,
                "-y",
                "-i", str(output_path),
                "-an",
                "-c:v", "libx264",
                "-preset", "fast",
                "-crf", "23",
                "-pix_fmt", "yuv420p",
                "-movflags", "+faststart",
                str(converted_path),
            ],
            capture_output=True,
            text=True,
            check=False,
        )

        if conversion.returncode != 0:
            error_details = conversion.stderr[-2000:]

            raise RuntimeError(
                "H.264 video conversion failed: " + error_details
            )

        if not converted_path.exists() or converted_path.stat().st_size == 0:
            raise RuntimeError(
                "FFmpeg did not produce a valid converted video."
            )

        # Replace the temporary MP4 with the H.264 version.
        converted_path.replace(output_path)

        # Count unique tracked objects by their final class.
        tracked_objects_by_class = {}

        for label in class_by_id.values():
            tracked_objects_by_class[label] = (
                tracked_objects_by_class.get(label, 0) + 1
            )

        return {
            "success": True,
            "original_filename": filename,
            "model": "YOLO11n + ByteTrack",
            "confidence_threshold": confidence,
            "inference_image_size": INFERENCE_IMAGE_SIZE,
            "processed_frames": processed_frames,
            "fps": round(fps, 2),
            "video_width": width,
            "video_height": height,
            "unique_tracked_objects": len(tracked_ids),
            "tracked_objects_by_class": tracked_objects_by_class,
            "frame_detection_counts": frame_detection_counts,
            "tracking_note": (
                "Track IDs may change when objects are occluded "
                "or tracking is lost."
            ),
            "annotated_video_url": f"/outputs/{output_name}",
        }

    except HTTPException:
        output_path.unlink(missing_ok=True)
        raise

    except Exception as exc:
        output_path.unlink(missing_ok=True)

        raise HTTPException(
            status_code=500,
            detail=(
                f"Video tracking failed: {type(exc).__name__}: {exc}"
            ),
        ) from exc

    finally:
        converted_path.unlink(missing_ok=True)
