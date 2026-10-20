const inputText = document.getElementById('inputText');
const outputText = document.getElementById('outputText');
const subtleAnswer = document.getElementById('subtleAnswer');
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
  inputText.focus();
});

translateBtn.addEventListener('click', async () => {
  const text = inputText.value.trim();
  const apiKey = apiKeyInput.value.trim();

  if (!text) return;
  if (!apiKey) {
    alert('Введите ключ API!');
    return;
  }

  btnText.innerText = 'Обработка...';
  translateBtn.disabled = true;
  subtleAnswer.innerText = '';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Translate to Russian. If Java test question with options, select correct letter. Return JSON ONLY: {"translation":"russian text","correct_option":"letter or null"}\n\nInput:\n${text}`
          }]
        }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1
        }
      })
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(`HTTP ${response.status}: ${errData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const rawText = data.candidates[0].content.parts[0].text;
    const result = JSON.parse(rawText);

    outputText.innerText = result.translation || 'Ошибка перевода';
    
    if (result.correct_option && result.correct_option !== "null") {
      subtleAnswer.innerText = String(result.correct_option).toUpperCase();
    }

  } catch (err) {
    if (err.name === 'AbortError') {
      outputText.innerText = 'Ошибка: Время ожидания истекло (более 10 сек). Проверьте интернет.';
    } else {
      outputText.innerText = `Ошибка: ${err.message}`;
    }
  } finally {
    btnText.innerText = 'Перевести';
    translateBtn.disabled = false;
  }
});
