
import cv2
import glob
import os

video_files = glob.glob("backend/outputs/*.mp4")

print("Number of videos found:", len(video_files))

for file_path in video_files:
    print("\nFile:", os.path.basename(file_path))
    print("File size:", os.path.getsize(file_path), "bytes")

    video = cv2.VideoCapture(file_path)

    print("Can Open:", video.isOpened())
    print("Frame Count:", int(video.get(cv2.CAP_PROP_FRAME_COUNT)))
    print("FPS:", video.get(cv2.CAP_PROP_FPS))
    print(
        "Resolution:",
        int(video.get(cv2.CAP_PROP_FRAME_WIDTH)),
        "x",
        int(video.get(cv2.CAP_PROP_FRAME_HEIGHT))
    )

    video.release()
