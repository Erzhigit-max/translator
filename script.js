const inputText = document.getElementById('inputText');
const outputText = document.getElementById('outputText');
const subtleAnswer = document.getElementById('subtleAnswer');
const answerCard = document.getElementById('answerCard');
const answerValue = document.getElementById('answerValue');
const clearBtn = document.getElementById('clearBtn');
const translateBtn = document.getElementById('translateBtn');
const btnText = document.getElementById('btnText');
const apiKeyInput = document.getElementById('apiKey');

if (localStorage.getItem('gemini_api_key')) {
  apiKeyInput.value = localStorage.getItem('gemini_api_key');
}

apiKeyInput.addEventListener('change', () => {
  localStorage.setItem('gemini_api_key', apiKeyInput.value.trim());
});

clearBtn.addEventListener('click', () => {
  inputText.value = '';
  outputText.innerText = 'Здесь появится перевод...';
  subtleAnswer.innerText = '';
  answerCard.style.display = 'none';
  inputText.focus();
});

async function sendRequest(model, text, apiKey) {
  return await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `Translate English to Russian. If input is a Java test question with options A,B,C,D,E,F, select correct letter. Return JSON ONLY:
{"translation":"russian text","has_question":true/false,"correct_option":"letter or null"}

Input:
${text}`
        }]
      }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
        maxOutputTokens: 250
      }
    })
  });
}

async function callGeminiWithFallback(text, apiKey) {
  // Список резервных моделей Google для обхода перегрузок (503)
  const models = [
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b',
    'gemini-2.5-flash'
  ];

  let lastError = '';

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await sendRequest(model, text, apiKey);
        
        if (res.ok) {
          return await res.json();
        }
        
        if (res.status === 503) {
          // Если модель перегружена (503), делаем паузу 250мс и переходим дальше
          await new Promise(r => setTimeout(r, 250));
          continue;
        }

        const errData = await res.json().catch(() => ({}));
        lastError = `HTTP ${res.status}: ${errData.error?.message || res.statusText}`;
        break;
      } catch (e) {
        lastError = e.message;
        break;
      }
    }
  }

  throw new Error(lastError || 'Серверы Google перегружены. Нажмите кнопку еще раз.');
}

translateBtn.addEventListener('click', async () => {
  const text = inputText.value.trim();
  const apiKey = apiKeyInput.value.trim();

  if (!text) return;
  if (!apiKey) {
    alert('Введите Gemini API Key!');
    return;
  }

  btnText.innerText = 'Обработка...';
  translateBtn.disabled = true;

  try {
    const data = await callGeminiWithFallback(text, apiKey);
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const result = JSON.parse(rawText);

    outputText.innerText = result.translation || 'Перевод отсутствует';

    if (result.has_question && result.correct_option) {
      const letter = String(result.correct_option).toUpperCase();
      answerValue.innerText = letter;
      answerCard.style.display = 'flex';
      
      // Неприметный дубликат снизу карточки перевода
      subtleAnswer.innerText = letter;
    } else {
      answerCard.style.display = 'none';
      subtleAnswer.innerText = '';
    }

  } catch (err) {
    outputText.innerText = `Ошибка: ${err.message}`;
    subtleAnswer.innerText = '';
    console.error(err);
  } finally {
    btnText.innerText = 'Перевести';
    translateBtn.disabled = false;
  }
});
