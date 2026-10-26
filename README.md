# VISIONAI — AI Object Detection & Tracking Platform

**An AI-powered computer vision platform for real-time-style object analysis, image detection, and multi-object video tracking.**

VISIONAI combines the YOLO object detection model, a FastAPI backend, and a modern React dashboard to deliver an interactive computer vision experience. It identifies objects in images, visualizes detection results, calculates object counts, and tracks objects across video frames.

## Overview

Computer vision enables machines to interpret visual information from images and videos. VISIONAI demonstrates these capabilities through an integrated application that connects deep learning inference with an interactive web interface.

The platform is designed to make object detection results easier to explore through annotated images, confidence scores, object statistics, and video tracking outputs.

## Key Features

- **AI-Based Object Detection:** Detects supported object classes in uploaded images using YOLO.
- **Visual Detection Results:** Displays annotated images with bounding boxes and class labels.
- **Confidence Analysis:** Presents model confidence scores for individual detections.
- **Object Counting:** Summarizes the total number of detected objects and class-wise counts.
- **Video Object Tracking:** Tracks detected objects across video frames using ByteTrack.
- **Interactive Dashboard:** Provides a modern, dark-themed interface with 3D-inspired visual elements.
- **Backend API:** Uses FastAPI to connect the frontend with computer vision processing.
- **Processed Output:** Provides detection results and processed video output through the application.

## Technology Stack

| Component | Technologies |
|---|---|
| Programming languages | Python, JavaScript |
| Object detection | Ultralytics YOLO |
| Object tracking | ByteTrack |
| Backend API | FastAPI, Uvicorn |
| Frontend | React, Vite |
| Computer vision | OpenCV |
| 3D visualization | Three.js, React Three Fiber |
| Package management | pip, npm |

## System Architecture

```text
                  USER
                   |
                   v
          React Web Dashboard
             (Vite + UI)
                   |
                   v
             FastAPI Backend
                   |
          +--------+---------+
          |                  |
          v                  v
    Image Detection     Video Tracking
          |                  |
          v                  v
       YOLO Model       YOLO + ByteTrack
          |                  |
          v                  v
   Boxes, Labels,       Tracked Video
   Confidence Scores       Output
          |                  |
          +--------+---------+
                   |
                   v
          Results in Dashboard
```

## Project Structure

```text
AI-Object-Detection-Tracking/
├── backend/
│   ├── main.py
│   └── check_video.py
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── screenshots/
├── test_videos/
├── app.py
├── requirements.txt
├── .gitignore
└── README.md
```

## Installation and Setup

### Prerequisites

Install the following before running the application:

- Python 3.12 or a compatible version
- Node.js and npm
- Git

### 1. Clone the repository

```bash
git clone https://github.com/Arjun1233333/VISIONAI-AI-Object-Detection-Tracking.git
cd VISIONAI-AI-Object-Detection-Tracking
```

### 2. Install Python dependencies

From the project root, run:

```bash
python -m pip install -r requirements.txt
```

### 3. Start the backend server

From the project root, execute:

```bash
python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

The backend should be available at:

- API: `http://127.0.0.1:8000`
- Health check: `http://127.0.0.1:8000/health`
- Interactive API documentation: `http://127.0.0.1:8000/docs`

### 4. Install frontend dependencies

Open a second terminal and navigate to the frontend directory:

```bash
cd frontend
npm install
```

### 5. Start the frontend

```bash
npm run dev
```

Open the local development URL printed in the terminal.

**Note:** Keep both the backend and frontend servers running while using the application. Model weights may need to be downloaded or configured on the first run, depending on the backend setup.

## How It Works

1. The user uploads an image or supported video through the dashboard.
2. The frontend sends the input to the FastAPI backend.
3. For image detection, YOLO identifies supported objects and returns bounding boxes, class labels, confidence scores, and object statistics.
4. For video tracking, the detection and tracking pipeline associates objects across frames.
5. The backend returns detection information and processed outputs.
6. The frontend displays the results through the VISIONAI dashboard.

## Applications

Potential applications of object detection and tracking include:

- Traffic and road-scene analysis
- Smart surveillance prototypes
- Retail object monitoring
- Industrial visual inspection
- Robotics and autonomous systems research
- Educational computer vision demonstrations

These are potential application areas; the project is not necessarily validated for production use in each domain.

## Current Scope and Limitations

- Detection performance depends on the model, image quality, lighting, and object visibility.
- The model detects supported classes rather than every possible object category.
- Video processing time depends on video length, resolution, and available hardware.
- Tracking accuracy can be affected by occlusion, fast motion, and changes in appearance.
- The current project is a development application and has not necessarily been benchmarked for production deployment.

## Future Enhancements

- Live webcam detection and tracking
- Detection performance and latency analytics
- Downloadable detection reports
- Support for additional models and custom-trained classes
- Model benchmarking using precision, recall, and mAP
- Cloud deployment and scalable inference

## Author

**Arjun**  
B.Tech — Artificial Intelligence and Machine Learning

GitHub: [@Arjun1233333](https://github.com/Arjun1233333)

## License

No license has been specified yet. Contact the author before reusing or redistributing this project unless a license is added to the repository.
