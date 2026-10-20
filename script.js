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

// Запрос к быстрым моделям Gemini с автоматической сменой при сбое
async function callGemini(text, apiKey) {
  const models = ['gemini-2.0-flash', 'gemini-3.8-flash'];
  let lastErr = null;

  for (const model of models) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Translate English to Russian. If input is a Java test question with options A,B,C,D,E,F, select correct letter. Return JSON ONLY:
{"translation":"russian translation","has_question":true/false,"correct_option":"letter or null"}

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

      if (response.ok) {
        return await response.json();
      } else {
        const errData = await response.json().catch(() => ({}));
        lastErr = new Error(`HTTP ${response.status}: ${errData.error?.message || response.statusText}`);
      }
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr || new Error('Ошибка связи с ИИ');
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
    const data = await callGemini(text, apiKey);
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const result = JSON.parse(rawText);

    outputText.innerText = result.translation || 'Перевод отсутствует';

    if (result.has_question && result.correct_option) {
      const letter = String(result.correct_option).toUpperCase();
      answerValue.innerText = letter;
      answerCard.style.display = 'flex';
      
      // Неприметная буква снизу перевода
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
