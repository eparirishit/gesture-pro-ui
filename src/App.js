import React, { useRef, useState } from "react";
import "./App.css";

function App() {
  const videoRef = useRef(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [predictedText, setPredictedText] = useState("");
  const captureInterval = useRef(null);

  const startVideo = () => {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((err) => console.error("Error accessing webcam:", err));
  };

  const captureFrame = async () => {
    if (!videoRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (!blob) {
        console.error("Failed to create a Blob from the canvas.");
        return;
      }

      const formData = new FormData();
      formData.append("frame", blob, "frame.jpg");

      try {
        const response = await fetch("http://127.0.0.1:8000/predict_frame", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          console.error("API response failed:", response.statusText);
          return;
        }

        const data = await response.json();

        if (data.predicted_text) {
          console.log("Predicted character:", data.predicted_text);
          setPredictedText(data.predicted_text);
        } else {
          console.log("No valid character detected.");
        }
      } catch (error) {
        console.error("Error predicting frame:", error);
      }
    }, "image/jpeg");
  };

  const handleStartCapture = () => {
    setIsCapturing(true);
    startVideo();

    if (captureInterval.current) {
      clearInterval(captureInterval.current);
    }

    captureInterval.current = setInterval(captureFrame, 1500);
  };

  const handleStopCapture = async () => {
    setIsCapturing(false);

    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
    }

    if (captureInterval.current) {
      clearInterval(captureInterval.current);
      captureInterval.current = null;
    }

    try {
      const response = await fetch("http://127.0.0.1:8000/reset_capture");
      const data = await response.json();
      console.log(data.message);
    } catch (error) {
      console.error("Error resetting capture:", error);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo-container">
          <img
            src="/gesture-pro-logo.svg"
            alt="GesturePro"
            className="app-logo"
          />
        </div>

        <div className="video-container">
          <video ref={videoRef} autoPlay muted className="video-feed" />
        </div>

        <div className="text-output">
          <p>{predictedText || "No transcription available."}</p>
        </div>

        <div className="start-stop-container">
          <button
            className={`start-stop-button ${isCapturing ? "capturing" : ""}`}
            onClick={isCapturing ? handleStopCapture : handleStartCapture}
          >
            <div className="inner-shape" />
          </button>
          <p className="start-stop-label">
            {isCapturing ? "Click to end" : "Click to start"}
          </p>
        </div>
      </header>
    </div>
  );
}

export default App;
