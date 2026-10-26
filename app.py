
import streamlit as st
from ultralytics import YOLO
from PIL import Image
from collections import Counter
import pandas as pd
import time

st.set_page_config(
    page_title="VISION AI | Object Intelligence",
    page_icon="🎯",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown("""
<style>
.stApp {
    background: #080e18;
    color: #e6edf7;
}
[data-testid="stHeader"] {
    background: rgba(8,14,24,0.95);
}
[data-testid="stSidebar"] {
    background: #0d1523;
    border-right: 1px solid #243448;
}
.block-container {
    padding-top: 1.8rem;
    padding-bottom: 2rem;
    max-width: 1500px;
}
h1, h2, h3, p, label {
    color: #e6edf7;
}
.eyebrow {
    color: #59e39a;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 2px;
}
.hero-title {
    font-size: 34px;
    font-weight: 800;
    margin: 5px 0;
    color: #f1f6ff;
}
.hero-subtitle {
    color: #8da2bb;
    font-size: 14px;
}
.metric-card {
    background: linear-gradient(135deg, #111e2e, #0d1725);
    border: 1px solid #24384c;
    border-radius: 12px;
    padding: 18px;
    min-height: 112px;
}
.metric-label {
    color: #8da2bb;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 1px;
}
.metric-value {
    color: #59e39a;
    font-size: 29px;
    font-weight: 800;
    margin-top: 7px;
}
.panel {
    background: #0d1725;
    border: 1px solid #243448;
    border-radius: 12px;
    padding: 18px;
}
.status-dot {
    color: #59e39a;
    font-weight: 700;
}
div.stButton > button {
    background: #59e39a;
    color: #07130e;
    border: none;
    border-radius: 8px;
    font-weight: 800;
    min-height: 44px;
    width: 100%;
}
div.stButton > button:hover {
    background: #7bf0b0;
    color: #07130e;
    border: none;
}
[data-testid="stFileUploader"] {
    background: #111d2c;
    border: 1px dashed #38516a;
    border-radius: 10px;
    padding: 12px;
}
[data-testid="stMetric"] {
    background: #101c2b;
    border: 1px solid #24384c;
    padding: 12px;
    border-radius: 10px;
}
hr {
    border-color: #243448;
}
</style>
""", unsafe_allow_html=True)


@st.cache_resource
def load_model():
    return YOLO("yolo11n.pt")


with st.sidebar:
    st.markdown(
        '<div class="eyebrow">VISION AI</div>',
        unsafe_allow_html=True
    )
    st.title("Control Center")
    st.caption("Computer Vision Intelligence")
    st.divider()

    page = st.radio(
        "NAVIGATION",
        ["Overview", "Image Detection", "About Project"],
        index=0
    )

    st.divider()
    st.markdown("**SYSTEM STATUS**")
    st.markdown(
        '<span class="status-dot">●</span> Application online',
        unsafe_allow_html=True
    )
    st.caption("Model: YOLO11 Nano")
    st.caption("Mode: Local inference")
    st.divider()
    st.caption("AI Object Detection & Tracking")


st.markdown(
    '<div class="eyebrow">COMPUTER VISION / INTELLIGENCE PLATFORM</div>',
    unsafe_allow_html=True
)
st.markdown(
    '<div class="hero-title">AI Vision Dashboard</div>',
    unsafe_allow_html=True
)
st.markdown(
    '<div class="hero-subtitle">'
    'Detect, classify and analyse objects in images using YOLO.'
    '</div>',
    unsafe_allow_html=True
)
st.write("")

if page == "Overview":
    c1, c2, c3 = st.columns(3)

    cards = [
        (c1, "PLATFORM", "ONLINE", "Application status"),
        (c2, "AI ENGINE", "YOLO11", "Pretrained detection model"),
        (c3, "INPUT MODE", "IMAGE", "Day 1 capability"),
    ]

    for col, label, value, detail in cards:
        with col:
            st.markdown(
                f'<div class="metric-card">'
                f'<div class="metric-label">{label}</div>'
                f'<div class="metric-value">{value}</div>'
                f'<div style="color:#8da2bb;font-size:12px;">'
                f'{detail}</div></div>',
                unsafe_allow_html=True
            )

    st.write("")
    st.markdown('<div class="panel">', unsafe_allow_html=True)
    st.subheader("Welcome to Vision AI")
    st.write(
        "Upload an image to identify objects, visualize bounding "
        "boxes, review confidence scores and analyse object counts."
    )
    st.write("")
    if st.button("Open Image Detection"):
        st.session_state["go_detection"] = True
        st.rerun()
    st.markdown('</div>', unsafe_allow_html=True)

    if st.session_state.get("go_detection"):
        st.info("Choose Image Detection from the sidebar to begin.")

elif page == "Image Detection":
    left, right = st.columns([1, 1.65], gap="large")

    with left:
        st.markdown("### Input Configuration")
        st.caption("Upload an image for AI inference.")

        uploaded_file = st.file_uploader(
            "Choose image",
            type=["jpg", "jpeg", "png"]
        )

        confidence = st.slider(
            "Minimum confidence threshold",
            min_value=0.10,
            max_value=0.95,
            value=0.25,
            step=0.05
        )

        run_detection = st.button(
            "RUN OBJECT DETECTION",
            disabled=uploaded_file is None
        )

        if uploaded_file is not None:
            image = Image.open(uploaded_file).convert("RGB")
            st.image(image, caption="Input image", use_container_width=True)

    with right:
        st.markdown("### Detection Output")

        if uploaded_file is None:
            st.markdown(
                '<div class="panel">'
                '<p style="color:#8da2bb;">'
                'Your annotated image will appear here after you upload '
                'an image and run detection.</p></div>',
                unsafe_allow_html=True
            )

        if uploaded_file is not None and run_detection:
            try:
                with st.spinner("Loading model and analysing image..."):
                    model = load_model()
                    start_time = time.perf_counter()
                    result = model.predict(
                        source=image,
                        conf=confidence,
                        verbose=False
                    )[0]
                    elapsed = time.perf_counter() - start_time

                annotated = result.plot()[:, :, ::-1]
                st.image(
                    annotated,
                    caption="AI annotated output",
                    use_container_width=True
                )

                detections = []
                for box in result.boxes:
                    class_id = int(box.cls[0].item())
                    score = float(box.conf[0].item())
                    detections.append({
                        "Object": result.names[class_id],
                        "Confidence (%)": round(score * 100, 2)
                    })

                counts = Counter(item["Object"] for item in detections)

                st.success("Image analysis completed.")
                m1, m2, m3 = st.columns(3)
                m1.metric("Objects detected", len(detections))
                m2.metric("Unique classes", len(counts))
                m3.metric("Inference time", f"{elapsed:.2f} s")

                if counts:
                    st.markdown("#### Object Distribution")
                    chart_data = pd.DataFrame(
                        list(counts.items()),
                        columns=["Object", "Count"]
                    ).set_index("Object")
                    st.bar_chart(chart_data)

                    st.markdown("#### Detection Details")
                    st.dataframe(
                        pd.DataFrame(detections),
                        use_container_width=True,
                        hide_index=True
                    )
                else:
                    st.info(
                        "No objects were detected at this threshold. "
                        "Try lowering the confidence setting."
                    )

            except Exception as error:
                st.error("Detection failed.")
                st.exception(error)

elif page == "About Project":
    st.markdown("### About Vision AI")
    st.write(
        "This project uses a pretrained YOLO model for object detection "
        "and OpenCV-based computer vision tools."
    )
    st.markdown("**Current features**")
    st.write("- Image upload and object detection")
    st.write("- Bounding-box visualization")
    st.write("- Confidence scores and object counts")
    st.markdown("**Planned improvements**")
    st.write("- Video object detection")
    st.write("- Multi-frame object tracking with tracking IDs")
    st.write("- Expanded analytics and reporting")

st.divider()
st.caption(
    "VISION AI • Educational computer vision project • "
    "Predictions may be incorrect."
)
