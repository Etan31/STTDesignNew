///FIXING THE RECORDING WHEN THE MAIN IS RELOAD
let isRecording = false;
let recognition = null;
let transcript = "";
let previousTranscript = "";

const startRecording = () => {
  isRecording = true;
  recognition = new window.webkitSpeechRecognition();
  recognition.interimResults = true;

  recognition.addEventListener("result", (event) => {
    transcript = Array.from(event.results)
      .map((result) => result[0])
      .map((result) => result.transcript)
      .join("");

    if (event.results[event.results.length - 1].isFinal) {
      previousTranscript = transcript;
    }

    const existingText = textarea.value.trim();
    if (existingText.length > 0) {
      if (existingText.endsWith(previousTranscript)) {
        textarea.value = existingText;
      } else {
        textarea.value = existingText + " " + transcript;
      }
    } else {
      textarea.value = transcript;
    }

    console.log(transcript);
  });

  recognition.addEventListener("end", () => {
    if (isRecording) {
      startRecording();
    }
  });

  recognition.start();
  document.getElementById("click_to_convert").style.backgroundColor = "#ff0000";
};

//not'''
const stopRecording = () => {
  if (isRecording) {
    isRecording = false;
    recognition.stop();

    document.getElementById("click_to_convert").style.backgroundColor = "";
  }
};

document.addEventListener("DOMContentLoaded", () => {
  const clickToConvertButton = document.getElementById("click_to_convert");
  clickToConvertButton.addEventListener("click", () => {
    if (!isRecording) {
      startRecording();
    } else {
      stopRecording();
    }
  });
});

//loader
window.addEventListener("load", () => {
  const loader = document.querySelector(".loader");

  loader.classList.add("loader--hidden");

  loader.addEventListener("transitionend", () => {
    document.body.removeChild(loader);
  });
});

// /LOADING SCREEN DURATION
// setTimeout(function () {
//   var loading = document.getElementById("loading");
//   loading.classList.add("hidden");
// }, 5000); // 5000 milliseconds = 5 seconds

// Clearing body of the input and textarea
const btn = document.getElementById("saveButton");
if (btn) {
  btn.addEventListener("click", () => {
    const inputField = document.getElementById("inputText");
    const textareaField = document.getElementById("convert_text");

    const inputText = inputField.value;
    const convertedText = textareaField.value;

    fetch("/saveData", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: {
          filename: inputText,
        },
        textarea: {
          convertedtext: convertedText,
        },
      }),
    })
      .then((response) => {
        if (response.ok) {
          // Clear the input and textarea fields
          inputField.value = "";
          textareaField.value = "";
        } else {
          console.error(response.statusText);
        }
      })
      .catch((error) => {
        console.error(error);
      });
  });
} else {
  console.error("Button not found");
}
