import { useEffect, useState } from "react";

function App() {
  const [newObit, setNewObit] = useState(false);
  const [Obit, setObit] = useState(false);

  const [name, setName] = useState("");
  const [born, setBorn] = useState("");
  const [died, setDied] = useState("");
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [nameError, setNameError] = useState(false);
  const [fileError, setFileError] = useState(false);
  const [bornError, setBornError] = useState(false);

  const [obitArray, setObitArray] = useState([]);
  const [create, setCreate] = useState(true);
  const [buttonText, setButtonText] = useState("Create New Obituary");

  const createObit = async (e) => {
    e.preventDefault();
    if (name.length === 0) {
      setNameError(true);
    } else {
      setNameError(false);
    }
    if (fileName.length === 0) {
      setFileError(true);
    } else {
      setFileError(false);
    }
    if (born.length === 0) {
      setBornError(true);
    } else {
      setBornError(false);
    }
    if (name.length === 0 || born.length === 0 || fileName.length === 0) {
      return;
    }

    setCreate(false);
    setButtonText("Loading result... Use this time to remember your loved one.");
    const data = new FormData();
    data.append("file", file[0]);
    data.append("name", name);
    data.append("born", formatDate(born));
    data.append("died", formatDate(died));

    const res = await fetch(
      `https://smsl6vk356ftypafalsor5lygi0lujlw.lambda-url.ca-central-1.on.aws/`,
      {
        method: "POST",
        body: data,
      }
    );
    const resJson = await res.json();

    if (obitArray.length > 0) {
      setObitArray([...obitArray, resJson]);
    } else {
      setObitArray([resJson]);
    }

    setObit(true);
    setNewObit(false);
    setCreate(true);
    setButtonText("Create New Obituary")
  };

  const getObit = async () => {
    const res = await fetch(
      `https://m6t3n7x4nu4azyqlsbpc26wtgy0mkiqq.lambda-url.ca-central-1.on.aws/`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    const extracted = await res.json();
    setObitArray(extracted);
    if (Array.isArray(extracted) && extracted.length > 0) {
      setObit(true);
    } else {
      setObit(false);
    }
  };

  useEffect(() => {
    getObit();
  }, []);

  useEffect(() => {
    if (file != null) {
      setFileName("(" + file[0]["name"] + ")");
    }
  }, [file]);

  useEffect(() => {
    if (!newObit) {
      setFile(null);
      setName("");
      setBorn("");
      setDied(currentDate());
      setFileName("");
    }
  }, [newObit]);

  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
  };

  const currentDate = () => {
    const date = new Date();
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toJSON()
      .substring(0, 19);
  };

  const formatDate = (when) => {
    const formatted = new Date(when).toLocaleString("en-US", options);
    if (formatted === "Invalid Date") {
      return "";
    }
    return formatted;
  };
  
  function handleImg(index) {
    const border = document.getElementById(`obit-img-${index}`)
    const imgIndex = document.getElementById(`obit-desc-${index}`)
    imgIndex.classList.toggle("click");
    border.classList.toggle("open")
  }

  function handlePlay(index) {
    const audio = document.getElementById(`audio-${index}`);
    const playButton = document.getElementById(`play-${index}`);

    audio.addEventListener('ended', () => {
      playButton.classList.remove("pause");
    });

    if (audio.paused) {
      audio.play();
      playButton.classList.add("pause");
    } else {
      audio.pause();
      playButton.classList.remove("pause");
    }
  }

  return (
    <div id="container">
      <header>
        <aside>
          <button id="menu-button" onClick={() => setNewObit(true)}>
            + New Obituary
          </button>
        </aside>
        <div id="app-header">
          <h1>The Last Show</h1>
        </div>
        <aside>&nbsp;</aside>
      </header>
      <div id="mainFlex">
        {Obit ? (
          <div className="flexItem">
            {obitArray.map((val, index) => (
              <div id="obit-container" key={index}>
                <div id={`obit-img-${index}`}>
                  <img
                    className="img"
                    src={val.file}
                    alt="ungabunga"
                    onClick={() => handleImg(index)}
                  ></img>
                  <p className="person">{val.name}</p>
                  <p className="life">
                    {formatDate(val.born)} - {formatDate(val.died)}
                  </p>
                </div>
                <div id={`obit-desc-${index}`}>
                  <p className="desc">{val.obituary}</p>
                  <audio id={`audio-${index}`} src={val.audio} autoPlay={false}></audio>
                  <button
                    id={`play-${index}`}
                    onClick={() => handlePlay(index)}
                  ></button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p id="no-obit-yet">No Obituary Yet.</p>
        )}
      </div>
      {newObit && (
        <div className="popup">
          <div className="overlay">
            <button
              id="close"
              onClick={() => {
                setNewObit(false);
                setBornError(false);
                setFileError(false);
                setNameError(false);
              }}
            >
              X
            </button>
            <div className="popup-content">
              <h1>Create a New Obituary</h1>
              <img className="picture" src="/casket.png" alt="Casket" />
              <label for="file" id="fileText">
                Select an image for the deceased {fileName}
                <input
                  id="file"
                  type="file"
                  required
                  accept="images"
                  onChange={(e) => setFile(e.target.files)}
                />
              </label>
              {fileError ? (
                <label id="error">Please choose an image</label>
              ) : (
                ""
              )}
              <input
                id="name"
                type="text"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              {nameError ? (
                <label id="error">Please fill out the name field</label>
              ) : (
                ""
              )}
              <div className="dates">
                <p>Born:&nbsp;</p>
                <input
                  id="born"
                  type="datetime-local"
                  value={born}
                  onChange={(e) => setBorn(e.target.value)}
                />
                <p>Died:&nbsp;</p>
                <input
                  id="death"
                  type="datetime-local"
                  value={died}
                  onChange={(e) => setDied(e.target.value)}
                />
              </div>
              {bornError ? (
                <label id="error">Please provide the date of birth</label>
              ) : (
                ""
              )}
              <button
                id="new-obit"
                disabled={!create}
                onClick={(e) => createObit(e)}
              >
                {buttonText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
