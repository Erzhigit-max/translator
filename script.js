const inputText = document.getElementById('inputText');
const outputText = document.getElementById('outputText');
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
            text: `You are an expert translator and senior Java developer.
Analyze the user input text.
Tasks:
1. Translate the entire English text to natural Russian. Keep original formatting.
2. Check if the text contains a test question with options (e.g. A, B, C, D, E, F).
3. If it is a Java or general multiple-choice question, evaluate it accurately and choose the correct single option letter.
4. Respond ONLY with a valid raw JSON object, without markdown code fences or extra text:
{
  "translation": "текст перевода на русский",
  "has_question": true/false,
  "correct_option": "буква (например A) или null"
}

Input:
${text}`
          }]
        }]
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(`Ошибка HTTP ${response.status}: ${errData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Не удалось разобрать ответ от ИИ.');

    const result = JSON.parse(jsonMatch[0]);

    outputText.innerText = result.translation;

    if (result.has_question && result.correct_option) {
      answerValue.innerText = String(result.correct_option).toUpperCase();
      answerCard.style.display = 'flex';
    } else {
      answerCard.style.display = 'none';
    }

  } catch (err) {
    outputText.innerText = `Ошибка: ${err.message}`;
    console.error(err);
  } finally {
    btnText.innerText = 'Перевести';
    translateBtn.disabled = false;
  }
});