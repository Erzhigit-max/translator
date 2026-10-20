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

  // Таймаут 10 секунд на случай проблем с мобильной сетью
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Translate to Russian. If Java test question with options, select correct letter. Return JSON ONLY:
{"translation":"russian text","has_question":true/false,"correct_option":"letter or null"}

Input:
${text}`
          }]
        }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
          maxOutputTokens: 200
        }
      })
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(`HTTP ${response.status}: ${errData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const result = JSON.parse(rawText);

    outputText.innerText = result.translation || 'Перевод отсутствует';

    if (result.has_question && result.correct_option) {
      const letter = String(result.correct_option).toUpperCase();
      answerValue.innerText = letter;
      answerCard.style.display = 'flex';
      subtleAnswer.innerText = letter; // Неприметная буква снизу
    } else {
      answerCard.style.display = 'none';
      subtleAnswer.innerText = '';
    }

  } catch (err) {
    if (err.name === 'AbortError') {
      outputText.innerText = 'Ошибка: Превышено время ожидания ответа (10 сек). Проверьте мобильный интернет.';
    } else {
      outputText.innerText = `Ошибка: ${err.message}`;
    }
    subtleAnswer.innerText = '';
  } finally {
    btnText.innerText = 'Перевести';
    translateBtn.disabled = false;
  }
});
