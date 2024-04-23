import React, { useEffect, useRef, useState } from 'react';
import { initNotifications, notify } from '@mycv/f8-notification';
import { Howl } from 'howler';
import * as mobilenet from '@tensorflow-models/mobilenet';
import * as knnClassifier from '@tensorflow-models/knn-classifier';
import '@tensorflow/tfjs';
import './App.css';
import soundURL from './assets/sound.mp3'

var sound = new Howl({
  src: [soundURL]
});

// sound.play();

const NOT_TOUCH_LABEL = 'not_touch';
const TOUCHED_LABEL = 'touched';
const TRAINING_TIMES = 50;
const TOUCH_CONFIDENCE = 0.8;


function App() {
  const video = useRef();
  const classifier = useRef();
  const canPlaySound = useRef(true);
  const mobilenetModule = useRef();
  const [touched, setTouched] = useState(false);
  const btn = document.getElementById('btn-1');
  var count = 0;
  
  const init = async () => {
    console.log('init...');
    await setupCamera();
    console.log('setup camera success');

    classifier.current = knnClassifier.create();

    mobilenetModule.current = await mobilenet.load();

    textresult = document.getElementById('message');
    textresult.innerText = ('Vui lòng không chạm tay lên mặt và bấm Train 1');


    initNotifications({ cooldown: 3000 });
  }

  const setupCamera = () => {
    return new Promise((resolve, reject) => { 
      navigator.getUserMedia = navigator.getUserMedia || 
      navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

      if (navigator.getUserMedia) {
        navigator.getUserMedia(
          { video :true }, 
          stream => {
            video.current.srcObject = stream;
            video.current.addEventListener('loadeddata', resolve);
          },
          error => reject(error)
        );
      } else {
        reject();
      }
    });
  }

  const train = async label => {
    
    console.log([label] + 'Dang train cho may mat cua ban');
    textresult = document.getElementById('message');
    textresult2 = document.getElementById('message2');
    count+=1;
    for (let i = 0; i < TRAINING_TIMES; i++) {
      textresult.innerText= (`Vui lòng chờ tiến độ đạt 100% sau đó bấm Train 2`).toString();
      textresult2.innerText= (` ${parseInt((i+1) / TRAINING_TIMES * 100)}%`).toString();

      if (i >= TRAINING_TIMES-1 && count ==0) {
        count+=1;
      }

      if (count >= 2) {
        textresult.innerText= (`Vui lòng chờ tiến độ đạt 100% sau đó bấm Run`).toString();
      }
      await training(label);
    }
  }

  /**
   * Bước 1: Train cho máy khuôn mặt không chạm tay.
   * Bước 2: Train cho máy khuôn mặt có chạm tay.
   * Bước 3: Lấy hình ảnh hiện tại, phân tích và so sánh với data đã học trước đó.
   * ==> Nếu matching data khuôn mặt chạm tay -> cảnh báo.
   * @param {*} label 
   * @returns 
   */

  const training = label => {
    return new Promise(async resolve => {
      const embedding = mobilenetModule.current.infer(
        video.current,
        true
      );
      classifier.current.addExample(embedding, label);
      await sleep(100);
      resolve();
    }); 
  }

  const run = async () => {

    textresult = document.getElementById('message');
    textresult2 = document.getElementById('message2');
    textresult.innerText = ('AI đang theo dõi bạn...');
    textresult2.innerText = ('');

    const embedding = mobilenetModule.current.infer(
      video.current,
      true
    );
    const result = await classifier.current.predictClass(embedding);
      // console.log('ĐANG TEST'+ result);
    if (
      result.label ==TOUCHED_LABEL && 
      result.confidences[result.label] > TOUCH_CONFIDENCE
      ) {
        console.log('Touched');
        if (canPlaySound.current) {
          canPlaySound.current = false;
          sound.play();
        }
        notify('Bỏ tay ra!', { body: 'Bạn vừa chạm tay vào mặt!' });
        setTouched(true);
      } else { 
        console.log('Not Touch');
        setTouched(false);
        }

    await sleep(200);
    run();
  }

  const sleep = (ms = 0)  => {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  useEffect(() => {
    init();

    sound.on('end', function(){
      canPlaySound.current = true;
    });
    //cleanup
    return () => {

    }

  }, []);

  return (
    <div className= {`main  ${touched ? 'touched' : ''}`}>
       <div className="head-title">
        <h1>Đồ án cuối kì môn đa phương tiện</h1>
        <h2>Website cảnh báo đừng chạm tay lên mặt</h2>
       </div>
        <video
          ref = {video}
          className="video"
          autoPlay
        />

      <p id="message">
        Vui lòng chờ chương trình sẵn sàng...
      </p>

      <p id="message2">
        
      </p>
  
    <div className="control">
    <button id ="btn-1" className="btn" onClick={() => train(NOT_TOUCH_LABEL)}>Train 1</button>
    <button id ="btn-2" className="btn" onClick={() => train(TOUCHED_LABEL)}>Train 2</button>
    <button id ="btn-3" className="btn" onClick={() => run()}>Run</button>
    </div>
    </div>
  );
}
var textresult = document.getElementById('message');
var textresult2 = document.getElementById('message2');
export default App;
