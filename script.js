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
    alert('Введите Gemini API Key в поле сверху!');
    return;
  }

  btnText.innerText = 'Обработка...';
  translateBtn.disabled = true;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Translate English to Russian. If input has a Java test question with options, select correct option letter (A,B,C,D,E,F). Return JSON only:
{"translation":"russian text","has_question":true/false,"correct_option":"letter or null"}

Input:
${text}`
          }]
        }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
          maxOutputTokens: 350
        }
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(`Ошибка HTTP ${response.status}: ${errData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const result = JSON.parse(rawText);

    outputText.innerText = result.translation || 'Перевод не найден';

    if (result.has_question && result.correct_option) {
      const optionLetter = String(result.correct_option).toUpperCase();
      
      // Синяя нижняя плашка
      answerValue.innerText = optionLetter;
      answerCard.style.display = 'flex';
      
      // Неприметный дубликат снизу текста перевода
      subtleAnswer.innerText = optionLetter;
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
