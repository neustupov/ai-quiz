document.addEventListener('DOMContentLoaded', () => {

    const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyzeYgYKJrhcyUI71MCcifTM1UDxi8JRgIDu1u1xBAaiViJ3ntnzmpHFIlH8wQpYbukvA/exec';

    const DIFFICULTY = {
        easy:   { label: 'Лёгкий',   color: 'emerald', points: 1 },
        medium: { label: 'Средний',  color: 'amber',   points: 2 },
        hard:   { label: 'Сложный',  color: 'rose',    points: 3 }
    };

    const state = {
        name: '',
        questions: [],
        quizQuestions: [],
        currentIndex: 0,
        score: 0,
        answered: false
    };

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

    function showScreen(name) {
        Object.values(screens).forEach(el => el.classList.add('hidden'));
        screens[name].classList.remove('hidden');
        screens[name].classList.add('fade-in');
    }

    async function loadQuestions() {
        try {
            const res = await fetch('./data/questions.json');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            state.questions = await res.json();
            console.log(`✅ Загружено ${state.questions.length} вопросов`);
            return true;
        } catch (err) {
            console.error('❌ Ошибка загрузки JSON:', err);
            startError.textContent = 'Не удалось загрузить вопросы. Проверьте файл data/questions.json';
            startError.classList.remove('hidden');
            return false;
        }
    }

    function shuffleArray(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    function selectQuestionsByDifficulty(allQuestions) {
        const byDiff = { easy: [], medium: [], hard: [] };
        allQuestions.forEach(q => {
            if (byDiff[q.difficulty]) byDiff[q.difficulty].push(q);
        });
        // Берём по 2 из каждой категории (можно изменить на .slice(0, 3) для 3/3/3)
        const pickTwo = (arr) => shuffleArray(arr).slice(0, 2);
        return [...pickTwo(byDiff.easy), ...pickTwo(byDiff.medium), ...pickTwo(byDiff.hard)];
    }

    function renderQuestion() {
        const q = state.quizQuestions[state.currentIndex];
        if (!q) {
            console.warn('⚠️ Вопросы закончились раньше времени.');
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

        // 🏷️ Бейдж сложности
        const diff = DIFFICULTY[q.difficulty] || DIFFICULTY.easy;
        const container = qText.parentElement;
        const oldBadge = container.querySelector('.diff-badge');
        if (oldBadge) oldBadge.remove();

        const badge = document.createElement('div');
        badge.className = `diff-badge inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border diff-${diff.color} mb-4 badge-enter`;
        badge.textContent = `${diff.label} • +${diff.points} балл${diff.points > 1 ? 'а' : ''}`;
        container.insertBefore(badge, qText);

        qOptions.innerHTML = '';
        q.options.forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.className = 'w-full text-left px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 hover:bg-gray-700/50 hover:border-cyan-500 transition text-white';
            btn.textContent = opt;
            btn.onclick = () => handleAnswer(idx, q.correctIndex, btn);
            qOptions.appendChild(btn);
        });
    }

    function handleAnswer(selected, correct, btn) {
        if (state.answered) return;
        state.answered = true;

        const q = state.quizQuestions[state.currentIndex];
        const diff = DIFFICULTY[q.difficulty] || DIFFICULTY.easy;

        const buttons = qOptions.querySelectorAll('button');
        buttons.forEach(b => {
            b.disabled = true;
            b.classList.remove('hover:bg-gray-700/50', 'hover:border-cyan-500');
        });

        if (selected === correct) {
            btn.classList.add('bg-emerald-600/20', 'border-emerald-500', 'text-emerald-300');
            state.score += diff.points;
            scoreText.textContent = `Очки: ${state.score}`;
        } else {
            btn.classList.add('bg-red-600/20', 'border-red-500', 'text-red-300');
            buttons[correct].classList.add('bg-emerald-600/20', 'border-emerald-500', 'text-emerald-300');
        }

        setTimeout(() => {
            state.currentIndex++;
            if (state.currentIndex < state.quizQuestions.length) {
                renderQuestion();
            } else {
                finishQuiz();
            }
        }, 1200);
    }

    function finishQuiz() {
        showScreen('results');
        resultName.textContent = state.name;
        resultScore.textContent = `${state.score}/12`;

        const messages = [
            "ИИ для тебя пока магия 🔮",
            "Есть над чем поработать 🤔",
            "Неплохой старт! 📈",
            "Хороший уровень 🧠",
            "Эксперт по ИИ! 🚀"
        ];
        resultMessage.textContent = messages[Math.min(Math.floor(state.score / 3), 4)];

        saveResult(state.name, state.score, 12);
        loadLeaderboard();
    }

    async function saveResult(name, score, total) {
        try {
            const url = new URL(APPS_SCRIPT_URL);
            url.searchParams.set('action', 'save');
            url.searchParams.set('name', name?.toString().slice(0, 30) || 'Аноним');
            url.searchParams.set('score', score);
            url.searchParams.set('total', total);
            await fetch(url.toString(), { method: 'GET', keepalive: true });
            console.log('✅ Результат сохранён');
        } catch (err) {
            console.warn('⚠️ Ошибка сохранения:', err);
        }
    }

    async function loadLeaderboard() {
        leaderboardBody.innerHTML = `<tr><td colspan="4" class="py-4 text-center text-gray-500">Загрузка результатов...</td></tr>`;
        try {
            const url = new URL(APPS_SCRIPT_URL);
            url.searchParams.set('action', 'load');
            const res = await fetch(url.toString());
            const json = await res.json();
            if (json.success && json.data?.length > 0) {
                renderTable(json.data);
            } else {
                leaderboardBody.innerHTML = `<tr><td colspan="4" class="py-4 text-center text-gray-500">Пока нет результатов</td></tr>`;
            }
        } catch (err) {
            console.error('❌ Ошибка таблицы:', err);
            leaderboardBody.innerHTML = `<tr><td colspan="4" class="py-4 text-center text-red-400">Не удалось загрузить</td></tr>`;
        }
    }

    function renderTable(data) {
        leaderboardBody.innerHTML = '';
        data.forEach((row, i) => {
            const tr = document.createElement('tr');
            tr.className = 'border-b border-gray-800 hover:bg-gray-800/30';
            tr.innerHTML = `
        <td class="py-3 pl-2 text-gray-500">${i + 1}</td>
        <td class="py-3 font-medium">${row.name}</td>
        <td class="py-3 text-right pr-2 font-bold text-cyan-400">${row.score}/${row.total}</td>
        <td class="py-3 text-right pr-2 text-gray-400">${row.date}</td>
      `;
            leaderboardBody.appendChild(tr);
        });
    }

    // 🔘 Кнопка старта
    startBtn.onclick = async () => {
        const name = nameInput.value.trim();
        if (!name) {
            startError.textContent = 'Введи имя, чтобы начать';
            startError.classList.remove('hidden');
            return;
        }
        startError.classList.add('hidden');
        startBtn.disabled = true;
        startBtn.textContent = 'Загрузка...';

        const loaded = await loadQuestions();
        if (!loaded) {
            startBtn.disabled = false;
            startBtn.textContent = 'Начать квиз';
            return;
        }

        state.name = name;
        state.quizQuestions = selectQuestionsByDifficulty(state.questions);

        if (state.quizQuestions.length < 6) {
            startError.textContent = 'Недостаточно вопросов в JSON (нужно мин. 2 на категорию)';
            startError.classList.remove('hidden');
            startBtn.disabled = false;
            startBtn.textContent = 'Начать квиз';
            return;
        }

        state.currentIndex = 0;
        state.score = 0;
        showScreen('quiz');
        renderQuestion();
        startBtn.textContent = 'Начать квиз';
    };

    restartBtn.onclick = () => {
        showScreen('start');
        nameInput.value = '';
    };
});