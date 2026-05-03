document.addEventListener('DOMContentLoaded', () => {
    // Состояние
    const state = {
        name: '',
        questions: [],
        quizQuestions: [],
        currentIndex: 0,
        score: 0,
        answered: false
    };

    // DOM элементы
    const screens = {
        start: document.getElementById('screen-start'),
        quiz: document.getElementById('screen-quiz'),
        results: document.getElementById('screen-results')
    };
    const nameInput = document.getElementById('name-input');
    const startBtn = document.getElementById('start-btn');
    const startError = document.getElementById('start-error');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('quiz-progress-text');
    const scoreText = document.getElementById('quiz-score');
    const qImage = document.getElementById('q-image');
    const qText = document.getElementById('q-text');
    const qOptions = document.getElementById('q-options');
    const resultName = document.getElementById('result-name');
    const resultScore = document.getElementById('result-score');
    const resultMessage = document.getElementById('result-message');
    const leaderboardBody = document.getElementById('leaderboard-body');
    const restartBtn = document.getElementById('restart-btn');

    const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/1b4ZVrlEYQ6sGRIAJ57eT5-hv0HSBvmYqiZe8bKZOKck/exec';

    // Переключение экранов
    function showScreen(name) {
        Object.values(screens).forEach(el => el.classList.add('hidden'));
        screens[name].classList.remove('hidden');
        screens[name].classList.add('fade-in');
    }

    // Загрузка вопросов
    async function loadQuestions() {
        try {
            const res = await fetch('./data/questions.json');
            if (!res.ok) throw new Error('Не удалось загрузить вопросы');
            state.questions = await res.json();
            return true;
        } catch (err) {
            console.error(err);
            alert('Ошибка загрузки вопросов. Проверьте файл data/questions.json');
            return false;
        }
    }

    // Рандомизация (Fisher-Yates)
    function shuffleArray(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    // Рендер вопроса
    function renderQuestion() {
        const q = state.quizQuestions[state.currentIndex];

        // 🔒 Защитная проверка: если вопроса нет — завершаем квиз без ошибки
        if (!q) {
            console.warn('Вопросы закончились, переходим к результатам.');
            finishQuiz();
            return;
        }

        state.answered = false;
        const total = state.quizQuestions.length;
        progressText.textContent = `Вопрос ${state.currentIndex + 1} из ${total}`;
        progressBar.style.width = `${((state.currentIndex + 1) / total) * 100}%`;
        scoreText.textContent = `Очки: ${state.score}`;

        qImage.src = q.image || '';
        qImage.classList.toggle('hidden', !q.image);
        qText.textContent = q.question;

        qOptions.innerHTML = '';
        q.options.forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.className = 'w-full text-left px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 hover:bg-gray-700/50 hover:border-cyan-500 transition text-white';
            btn.textContent = opt;
            btn.onclick = () => handleAnswer(idx, q.correctIndex, btn);
            qOptions.appendChild(btn);
        });
    }

    // Обработка ответа
    function handleAnswer(selected, correct, btn) {
        if (state.answered) return;
        state.answered = true;

        const buttons = qOptions.querySelectorAll('button');
        buttons.forEach(b => {
            b.disabled = true;
            b.classList.remove('hover:bg-gray-700/50', 'hover:border-cyan-500');
        });

        if (selected === correct) {
            btn.classList.add('bg-emerald-600/20', 'border-emerald-500', 'text-emerald-300');
            state.score++;
            scoreText.textContent = `Очки: ${state.score}`;
        } else {
            btn.classList.add('bg-red-600/20', 'border-red-500', 'text-red-300');
            buttons[correct].classList.add('bg-emerald-600/20', 'border-emerald-500', 'text-emerald-300');
        }

        setTimeout(() => {
            state.currentIndex++;
            if (state.currentIndex < 10) {
                renderQuestion();
            } else {
                finishQuiz();
            }
        }, 1200);
    }

    // Завершение квиза
    function finishQuiz() {
        showScreen('results');
        resultName.textContent = state.name;
        resultScore.textContent = `${state.score}/10`;

        const messages = [
            "ИИ для тебя пока магия 🔮",
            "Есть над чем поработать 🤔",
            "Неплохой старт! 📈",
            "Хороший уровень 🧠",
            "Эксперт по ИИ! 🚀"
        ];
        resultMessage.textContent = messages[Math.min(Math.floor(state.score / 2.5), 4)];

        // Сохраняем и загружаем таблицу
        saveResult(state.name, state.score, 10);
        loadLeaderboard();
    }

    // Сохранение результата
    async function saveResult(name, score, total) {
        try {
            // 🔥 Важно: no-cors mode + text/plain чтобы избежать preflight
            await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                // Не указываем Content-Type: application/json — браузер поставит text/plain автоматически
                body: JSON.stringify({ name, score, total })
                // mode: 'no-cors' НЕ используем — иначе не прочитаем ответ
            });
            // Ответ от Apps Script при no-preflight приходит без CORS-заголовков,
            // но данные всё равно записываются. Для чтения ответа нужна дополнительная обработка,
            // но для нашей задачи достаточно факта отправки.
        } catch (err) {
            console.warn('Не удалось сохранить результат:', err);
        }
    }

    // Загрузка лидерборда
    async function loadLeaderboard() {
        leaderboardBody.innerHTML = `<tr><td colspan="4" class="py-4 text-center text-gray-500">Загрузка результатов...</td></tr>`;

        try {
            const res = await fetch(APPS_SCRIPT_URL);
            const json = await res.json();

            if (json.success && json.data.length > 0) {
                renderTable(json.data);
            } else {
                leaderboardBody.innerHTML = `<tr><td colspan="4" class="py-4 text-center text-gray-500">Пока нет результатов</td></tr>`;
            }
        } catch (err) {
            console.error('Ошибка загрузки таблицы:', err);
            leaderboardBody.innerHTML = `<tr><td colspan="4" class="py-4 text-center text-red-400">Не удалось загрузить таблицу</td></tr>`;
        }
    }

    function renderTable(data) {
        leaderboardBody.innerHTML = '';
        if (!data.length) {
            leaderboardBody.innerHTML = `<tr><td colspan="4" class="py-4 text-center text-gray-500">Пока нет результатов</td></tr>`;
            return;
        }
        data.forEach((row, i) => {
            const tr = document.createElement('tr');
            tr.className = 'border-b border-gray-800 hover:bg-gray-800/30';
            tr.innerHTML = `
        <td class="py-3 pl-2 text-gray-500">${i + 1}</td>
        <td class="py-3 font-medium">${row.name}</td>
        <td class="py-3 text-right pr-2 font-bold text-cyan-400">${row.score}/10</td>
        <td class="py-3 text-right pr-2 text-gray-400">${row.date}</td>
      `;
            leaderboardBody.appendChild(tr);
        });
    }

    // Инициализация
    startBtn.onclick = async () => {
        const name = nameInput.value.trim();
        if (!name) {
            startError.textContent = 'Введи имя, чтобы начать';
            startError.classList.remove('hidden');
            return;
        }
        startError.classList.add('hidden');
        state.name = name;

        const loaded = await loadQuestions();
        if (!loaded) return;

        state.quizQuestions = shuffleArray(state.questions).slice(0, 10);
        state.currentIndex = 0;
        state.score = 0;
        showScreen('quiz');
        renderQuestion();
    };

    restartBtn.onclick = () => {
        showScreen('start');
        nameInput.value = '';
    };
});