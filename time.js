    (() => {
      'use strict';
      const $ = (id) => document.getElementById(id);
      // Some layouts omit optional builder stat elements.
      const setTextIfPresent = (id, value) => { const el = $(id); if (el) el.textContent = value; };
      const fmt = (total) => { total = ((Math.round(total) % 1440) + 1440) % 1440; const h24 = Math.floor(total / 60), m = total % 60, h = h24 % 12 || 12; return `${h}:${String(m).padStart(2, '0')}`; };
      const fmtAmPm = (total) => { total = ((Math.round(total) % 1440) + 1440) % 1440; const h24 = Math.floor(total / 60), m = total % 60, h = h24 % 12 || 12; return `${h}:${String(m).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`; };
      const from12 = (h, m) => ((h % 12) * 60 + m) % 1440;
      const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
      const shuffle = (a) => [...a].sort(() => Math.random() - .5);
      let save = { stars: 0, bestQuiz: 0, bestDetective: 0, builderSolved: 0, quizCompleted: 0, detectiveCompleted: 0 };
      try { const saved = JSON.parse(localStorage.getItem('gurutaku-timequest-v1') || 'null'); if (saved && typeof saved === 'object') save = { ...save, ...saved }; } catch (_) { }
      function persist() { try { localStorage.setItem('gurutaku-timequest-v1', JSON.stringify(save)); } catch (_) { } }
      function updateHeader() {
        $('starCount').textContent = save.stars;
        persist();
      }
      let toastTimer; function toast(message) { const t = $('toast'); t.textContent = message; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2100) }
      function showView(name) { document.querySelectorAll('.view').forEach(v => v.classList.remove('active')); $(name + 'View').classList.add('active'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
      document.querySelectorAll('[data-home]').forEach(b => b.addEventListener('click', () => { stopQuizTimer(); showView('home'); updateHeader() })); $('startBtn').addEventListener('click', () => startBuilder()); document.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => { if (b.dataset.mode === 'builder') startBuilder(); if (b.dataset.mode === 'quiz') startQuiz(); if (b.dataset.mode === 'detective') startDetective() }));

      // Accessible SVG clock renderer; hands can be moved with pointer or control buttons.
      let activeClockHand = null;
      const polar = (angle, r) => ({ x: 150 + Math.sin(angle * Math.PI / 180) * r, y: 150 - Math.cos(angle * Math.PI / 180) * r });
      function renderClock(svg, minutes, interactive = false) {
        const h24 = Math.floor((((minutes % 1440) + 1440) % 1440) / 60), m = ((Math.round(minutes) % 60) + 60) % 60, h = h24 % 12;
        let s = '<circle class="clock-face" cx="150" cy="150" r="137"/><circle class="clock-ring" cx="150" cy="150" r="119"/>';
        for (let i = 0; i < 60; i++) { const a = i * 6, p1 = polar(a, i % 5 === 0 ? 111 : 117), p2 = polar(a, i % 5 === 0 ? 126 : 122); s += `<line class="${i % 5 === 0 ? 'hour-tick' : 'minute-tick'}" x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}"/>`; }
        for (let i = 1; i <= 12; i++) { const p = polar(i % 12 * 30, 96); s += `<text class="clock-num" x="${p.x}" y="${p.y}">${i}</text>`; }
        const hourAngle = (h * 30) + (m * .5), minAngle = m * 6, hp = polar(hourAngle, 58), mp = polar(minAngle, 88);
        const hourClass = `hand-hour${interactive && activeClockHand === 'hour' ? ' is-active' : ''}`, minuteClass = `hand-minute${interactive && activeClockHand === 'minute' ? ' is-active' : ''}`;
        s += `<line class="${hourClass}" data-hand="hour" x1="150" y1="150" x2="${hp.x}" y2="${hp.y}"/><line class="${minuteClass}" data-hand="minute" x1="150" y1="150" x2="${mp.x}" y2="${mp.y}"/><circle class="hub-outer" cx="150" cy="150" r="8"/><circle class="hub-inner" cx="150" cy="150" r="3"/>`;
        svg.innerHTML = s; svg.setAttribute('aria-label', `Analog clock${interactive ? ' you can adjust' : ''}${interactive ? '.' : ' showing ' + fmt(minutes)}.`); svg.dataset.interactive = interactive ? 'true' : 'false';
      }
      let builder = { target: 180, current: 720, solved: 0, tries: 0, run: 0, bestRun: 0, challenge: 0, earned: 0, checked: false };
      const targets = [from12(3, 0), from12(6, 30), from12(9, 15), from12(2, 45), from12(7, 20), from12(10, 55), from12(1, 35), from12(4, 50), from12(8, 10), from12(11, 40)];
      function newBuilder(options = {}) {
        const preserveFeedback = options.preserveFeedback === true;
        builder.challenge++;
        builder.target = targets[(builder.challenge - 1) % targets.length];
        builder.current = from12(6, 0);
        builder.checked = false;
        $('checkBuilder').disabled = false;
        $('checkBuilder').textContent = 'Check my clock ✓';
        $('builderTarget').textContent = fmt(builder.target);
        $('builderHint').textContent = preserveFeedback
          ? 'Great job! A new challenge is ready. Set the clock to match the time shown.'
          : (builder.challenge < 3 ? 'Start with the hour hand, then set the minutes.' : 'Look closely at both hands. You can do it!');
        if (preserveFeedback) {
          // Keep the success message visible while the next target is already shown.
          $('builderFeedback').className = 'feedback show good';
        } else {
          $('builderFeedback').className = 'feedback';
          $('builderFeedback').textContent = '';
        }
        updateBuilderClock();
        setTextIfPresent('builderDone', builder.solved);
        setTextIfPresent('builderRun', builder.run);
        $('builderStars').textContent = builder.earned;
      }
      function startBuilder() { stopQuizTimer(); showView('builder'); newBuilder() }
      function updateBuilderClock() { renderClock($('builderClock'), builder.current, true) }
      function modifyBuilder(delta) { if (builder.checked) return; builder.current = ((builder.current + delta) % 1440 + 1440) % 1440; $('checkBuilder').textContent = 'Check my clock ✓'; $('builderFeedback').className = 'feedback'; updateBuilderClock() }
      document.querySelectorAll('[data-clock-adjust]').forEach(b => b.addEventListener('click', () => modifyBuilder(Number(b.dataset.clockAdjust))));
      $('checkBuilder').addEventListener('click', () => {
        if (builder.checked) return;
        builder.tries++;
        const difference = Math.abs((((builder.current - builder.target) + 720 + 1440) % 1440) - 720);
        const fb = $('builderFeedback');
        fb.classList.add('show');
        if (difference === 0) {
          builder.checked = true;
          builder.solved++;
          builder.run++;
          builder.bestRun = Math.max(builder.bestRun, builder.run);
          builder.earned++;
          save.stars++;
          fb.className = 'feedback show good';
          fb.textContent = '🎉 Perfect timing! +1 star! Your next challenge is ready.';
          setTextIfPresent('builderDone', builder.solved);
          setTextIfPresent('builderRun', builder.run);
          $('builderStars').textContent = builder.earned;
          updateHeader();
          // Advance immediately so the next challenge cannot be blocked by a timer
          // or an exception in a delayed callback. Keep the success message visible.
          newBuilder({ preserveFeedback: true });
        } else {
          builder.run = 0;
          fb.className = 'feedback show try';
          fb.textContent = `Not quite yet. Your clock says ${fmt(builder.current)}. Check the short hand for the hour and count by fives for the minutes.`;
          setTextIfPresent('builderRun', 0);
        }
      });
      $('builderLearn').addEventListener('click', () => showView('learn'));
      function setupClockDrag(svg, getTime, setTime) {
        let active = null, lastMinuteAngle = null;
        const getPoint = (e) => { const rect = svg.getBoundingClientRect(); return { x: (e.clientX - rect.left) / rect.width * 300, y: (e.clientY - rect.top) / rect.height * 300 }; };
        const setFromPointer = (e) => {
          if (!active || builder.checked) return;
          const p = getPoint(e), dx = p.x - 150, dy = 150 - p.y;
          const deg = (Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360;
          let value = getTime();
          if (active === 'minute') {
            const m = Math.round(deg / 30) * 5 % 60;
            let hour = Math.floor(value / 60);
            if (lastMinuteAngle !== null) {
              let angleDelta = deg - lastMinuteAngle;
              if (angleDelta < -180) hour += 1;       // clockwise across 12: advance the hour
              else if (angleDelta > 180) hour -= 1;  // counter-clockwise across 12: go back an hour
            }
            lastMinuteAngle = deg;
            value = hour * 60 + m;
          } else {
            // Move the hour hand independently; keep the minute hand where it is.
            const mins = ((value % 60) + 60) % 60;
            const hour12 = Math.round((deg - mins * .5) / 30) % 12;
            const h24 = Math.floor(value / 60), pm = h24 >= 12;
            const h = hour12 === 0 ? 12 : hour12;
            value = ((pm ? (h % 12) + 12 : (h % 12)) * 60) + mins;
          }
          setTime(value);
        };
        svg.addEventListener('pointerdown', e => {
          if (svg.dataset.interactive !== 'true') return;
          const p = getPoint(e);
          const distanceToHand = (name) => {
            const line = svg.querySelector(`[data-hand="${name}"]`);
            if (!line) return Infinity;
            const x1 = Number(line.getAttribute('x1')), y1 = Number(line.getAttribute('y1'));
            const x2 = Number(line.getAttribute('x2')), y2 = Number(line.getAttribute('y2'));
            const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
            // Ignore the shared centre hub so it does not obscure which hand is nearest.
            const sx = x1 + dx * 12 / len, sy = y1 + dy * 12 / len, ex = x2, ey = y2;
            const vx = ex - sx, vy = ey - sy, den = vx * vx + vy * vy || 1;
            const t = Math.max(0, Math.min(1, ((p.x - sx) * vx + (p.y - sy) * vy) / den));
            return Math.hypot(p.x - (sx + t * vx), p.y - (sy + t * vy));
          };
          const hourDistance = distanceToHand('hour'), minuteDistance = distanceToHand('minute');
          const nearestDistance = Math.min(hourDistance, minuteDistance);
          // Start a drag only when the pointer is near a visible clock hand.
          // Never guess a hand based on how far from the centre the click occurred.
          const hitRadius = e.pointerType === 'touch' ? 20 : 15;
          if (nearestDistance > hitRadius) return;
          active = hourDistance <= minuteDistance ? 'hour' : 'minute';
          activeClockHand = active;
          lastMinuteAngle = active === 'minute' ? (((getTime() % 60) + 60) % 60) * 6 : null;
          svg.setPointerCapture?.(e.pointerId);
          setFromPointer(e);
        });
        svg.addEventListener('pointermove', e => { if (active) setFromPointer(e) });
        const end = () => { if (!active) return; active = null; activeClockHand = null; lastMinuteAngle = null; updateBuilderClock() };
        svg.addEventListener('pointerup', end);
        svg.addEventListener('pointercancel', end);
        svg.addEventListener('lostpointercapture', end);
      }
      setupClockDrag($('builderClock'), () => builder.current, v => { if (builder.checked) return; builder.current = ((v % 1440) + 1440) % 1440; $('checkBuilder').textContent = 'Check my clock ✓'; $('builderFeedback').className = 'feedback'; updateBuilderClock() });

      // Beat the Clock: ten questions, one star for every correct answer.
      let quiz = { round: 0, total: 10, correct: 0, streak: 0, best: 0, target: 0, answered: false, seconds: 15, earned: 0, timer: null };
      function stopQuizTimer() { if (quiz.timer) { clearInterval(quiz.timer); quiz.timer = null } }
      function randomClockTime() { const h = rand(1, 12), m = rand(0, 11) * 5; return from12(h, m) }
      function createTimeOptions(target) { const vals = new Set([target]); let guard = 0; while (vals.size < 4 && guard++ < 100) { let candidate; if (Math.random() < .45) candidate = (target + rand(-3, 3) * 5 + 720) % 720; else candidate = randomClockTime(); candidate = Math.floor(candidate / 60) * 60 + Math.round((candidate % 60) / 5) * 5; if (candidate !== target) vals.add(candidate); } return shuffle([...vals]); }
      function startQuiz() { stopQuizTimer(); quiz = { round: 0, total: 10, correct: 0, streak: 0, best: 0, target: 0, answered: false, seconds: 15, earned: 0, timer: null }; $('quizPlay').style.display = 'grid'; $('quizComplete').style.display = 'none'; showView('quiz'); nextQuizQuestion(); }
      function updateQuizStats() { $('quizCorrect').textContent = quiz.correct; $('quizStreak').textContent = quiz.streak; $('quizBest').textContent = quiz.best; $('quizStars').textContent = quiz.earned }
      function nextQuizQuestion() { stopQuizTimer(); if (quiz.round >= quiz.total) { finishQuiz(); return; } quiz.round++; quiz.target = randomClockTime(); quiz.answered = false; quiz.seconds = 15; $('quizRound').textContent = `QUESTION ${quiz.round} OF ${quiz.total}`; $('quizSeconds').textContent = quiz.seconds; $('timerFill').style.width = '100%'; $('timerFill').style.background = '#55bd8c'; renderClock($('quizClock'), quiz.target, false); $('quizFeedback').className = 'feedback'; $('quizFeedback').textContent = ''; $('nextQuiz').disabled = true; $('nextQuiz').textContent = quiz.round === quiz.total ? 'See results →' : 'Next question →'; $('quizOptions').innerHTML = ''; createTimeOptions(quiz.target).forEach(answer => { const btn = document.createElement('button'); btn.className = 'option-btn'; btn.textContent = fmt(answer); btn.addEventListener('click', () => answerQuiz(btn, answer)); $('quizOptions').appendChild(btn) }); updateQuizStats(); quiz.timer = setInterval(() => { quiz.seconds--; if (quiz.seconds <= 0) { $('quizSeconds').textContent = '0'; $('timerFill').style.width = '0%'; stopQuizTimer(); if (!quiz.answered) answerQuiz(null, null, true); return; } $('quizSeconds').textContent = quiz.seconds; $('timerFill').style.width = Math.max(0, quiz.seconds / 15 * 100) + '%'; if (quiz.seconds <= 5) $('timerFill').style.background = '#ff8f78'; }, 1000); }
      function answerQuiz(button, answer, timedOut = false) { if (quiz.answered) return; quiz.answered = true; stopQuizTimer(); const good = answer === quiz.target; const fb = $('quizFeedback'); fb.classList.add('show'); document.querySelectorAll('#quizOptions .option-btn').forEach(btn => { btn.disabled = true; if (btn.textContent === fmt(quiz.target)) btn.classList.add('correct'); }); if (good) { quiz.correct++; quiz.streak++; quiz.best = Math.max(quiz.best, quiz.streak); quiz.earned++; save.stars++; fb.className = 'feedback show good'; fb.textContent = '✅ That’s right! You read the clock perfectly. +1 star!'; if (button) button.classList.add('correct'); } else { quiz.streak = 0; fb.className = 'feedback show try'; fb.textContent = timedOut ? `⏰ Time's up! The clock shows ${fmt(quiz.target)}.` : `Almost! The correct time is ${fmt(quiz.target)}. Keep practising!`; if (button) button.classList.add('wrong'); } save.bestQuiz = Math.max(save.bestQuiz, quiz.best); save.quizCompleted = quiz.correct; updateQuizStats(); updateHeader(); $('nextQuiz').disabled = false; }
      function finishQuiz() { stopQuizTimer(); $('quizPlay').style.display = 'none'; const box = $('quizComplete'); box.style.display = 'block'; const pct = Math.round(quiz.correct / quiz.total * 100); box.innerHTML = `<div class="complete-emoji">${pct >= 80 ? '🏆' : pct >= 50 ? '🌟' : '💪'}</div><h2>${pct >= 80 ? 'Time Master!' : pct >= 50 ? 'Great effort!' : 'Keep practising!'}</h2><p>You got <strong>${quiz.correct} out of ${quiz.total}</strong> questions right. ${pct >= 80 ? 'You are getting really good at reading clocks!' : 'Every question helps your brain get stronger. Try again and beat your score!'}</p><div class="complete-score"><div><strong>${quiz.correct}/${quiz.total}</strong><span>CORRECT</span></div><div><strong>${quiz.best}</strong><span>BEST STREAK</span></div><div><strong>⭐ ${quiz.earned}</strong><span>STARS WON</span></div></div><button class="primary" id="quizAgain">Play again ↻</button> <button class="secondary" id="quizHome">Back home</button>`; $('quizAgain').addEventListener('click', startQuiz); $('quizHome').addEventListener('click', () => { showView('home'); updateHeader() }); }
      $('nextQuiz').addEventListener('click', nextQuizQuestion); $('restartQuiz').addEventListener('click', startQuiz);

      // Time Detective: elapsed-time and duration questions.
      let detective = { round: 0, total: 8, correct: 0, streak: 0, best: 0, target: 0, answered: false, earned: 0, caseData: null };
      const pad = n => String(n).padStart(2, '0');
      function newCase() {
        const type = rand(0, 2), startHour = rand(1, 10), startMin = rand(0, 11) * 5, start = from12(startHour, startMin), duration = [15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 90, 95, 105, 120][rand(0, 17)], end = (start + duration) % 1440; let question, help, target, opts = []; if (type === 0) { question = `A movie starts at ${fmtAmPm(start)} and lasts ${duration} minutes. When does it end?`; help = 'Add the minutes. If you pass 60, move into the next hour.'; target = end; opts = [end, (end + 30) % 1440, (end + 60) % 1440, (end + 1380) % 1440]; } else if (type === 1) { const finish = (start + duration) % 1440; question = `You start your homework at ${fmtAmPm(start)} and finish at ${fmtAmPm(finish)}. How long did you work?`; help = 'Count forward from the start time to the finish time.'; target = duration; opts = [duration, Math.max(5, duration - 15), duration + 15, duration === 60 ? 90 : 60].map(v => v === target ? v : Math.min(180, Math.max(5, v))); } else { const depart = (start + duration) % 1440; question = `The bus leaves at ${fmtAmPm(start)}. The ride takes ${duration} minutes. What time does it arrive?`; help = 'Add the journey time to the departure time.'; target = depart; opts = [depart, (depart + 15) % 1440, (depart + 60) % 1440, (depart + 1395) % 1440]; }
        const uniq = [...new Set(opts)]; while (uniq.length < 4) { const other = type === 1 ? rand(10, 130) : ((target + rand(-4, 4) * 15 + 1440) % 1440); if (other !== target && !uniq.includes(other)) uniq.push(other); } return { question, help, target, opts: shuffle(uniq.slice(0, 4)), type };
      }
      function detectiveOptionText(value) { return detective.caseData.type === 1 ? `${value} minutes` : fmtAmPm(value) }
      function startDetective() { detective = { round: 0, total: 8, correct: 0, streak: 0, best: 0, target: 0, answered: false, earned: 0, caseData: null }; $('detectivePlay').style.display = 'grid'; $('detectiveComplete').style.display = 'none'; showView('detective'); nextDetectiveQuestion() }
      function updateDetectiveStats() { $('detectiveCorrect').textContent = detective.correct; $('detectiveStreak').textContent = detective.streak; $('detectiveBest').textContent = detective.best; $('detectiveStars').textContent = detective.earned }
      function nextDetectiveQuestion() { if (detective.round >= detective.total) { finishDetective(); return; } detective.round++; detective.caseData = newCase(); detective.target = detective.caseData.target; detective.answered = false; $('detectiveRound').textContent = `CASE ${detective.round} OF ${detective.total}`; $('detectiveQuestion').textContent = detective.caseData.question; $('detectiveHelp').textContent = detective.caseData.help; $('detectiveFeedback').className = 'feedback'; $('detectiveFeedback').textContent = ''; $('nextDetective').disabled = true; $('nextDetective').textContent = detective.round === detective.total ? 'See results →' : 'Next case →'; $('detectiveOptions').innerHTML = ''; detective.caseData.opts.forEach(value => { const btn = document.createElement('button'); btn.className = 'option-btn choice-time'; btn.textContent = detectiveOptionText(value); btn.addEventListener('click', () => answerDetective(btn, value)); $('detectiveOptions').appendChild(btn) }); updateDetectiveStats() }
      function answerDetective(button, value) { if (detective.answered) return; detective.answered = true; const correct = value === detective.target, fb = $('detectiveFeedback'); document.querySelectorAll('#detectiveOptions .option-btn').forEach(btn => { btn.disabled = true; if (btn.textContent === detectiveOptionText(detective.target)) btn.classList.add('correct') }); fb.classList.add('show'); if (correct) { detective.correct++; detective.streak++; detective.best = Math.max(detective.best, detective.streak); detective.earned++; save.stars++; fb.className = 'feedback show good'; fb.textContent = '🕵️ Case solved! You cracked the time puzzle. +1 star!'; button.classList.add('correct') } else { detective.streak = 0; fb.className = 'feedback show try'; fb.textContent = `Not this time. The answer is ${detectiveOptionText(detective.target)}. Read the times carefully and try another case!`; button.classList.add('wrong') } save.bestDetective = Math.max(save.bestDetective, detective.best); save.detectiveCompleted = detective.correct; updateDetectiveStats(); updateHeader(); $('nextDetective').disabled = false; }
      function finishDetective() { $('detectivePlay').style.display = 'none'; const box = $('detectiveComplete'); box.style.display = 'block'; const pct = Math.round(detective.correct / detective.total * 100); box.innerHTML = `<div class="complete-emoji">${pct >= 80 ? '🕵️‍♀️🏆' : pct >= 50 ? '🔎🌟' : '🧠💪'}</div><h2>${pct >= 80 ? 'Top Detective!' : pct >= 50 ? 'Clue collector!' : 'Keep investigating!'}</h2><p>You solved <strong>${detective.correct} out of ${detective.total}</strong> time cases. ${pct >= 80 ? 'Your time calculations are sharp!' : 'Practise counting forward and you will get even better.'}</p><div class="complete-score"><div><strong>${detective.correct}/${detective.total}</strong><span>CASES SOLVED</span></div><div><strong>${detective.best}</strong><span>BEST STREAK</span></div><div><strong>⭐ ${detective.earned}</strong><span>STARS WON</span></div></div><button class="primary" id="detectiveAgain">Solve more cases ↻</button> <button class="secondary" id="detectiveHome">Back home</button>`; $('detectiveAgain').addEventListener('click', startDetective); $('detectiveHome').addEventListener('click', () => { showView('home'); updateHeader() }); }
      $('nextDetective').addEventListener('click', nextDetectiveQuestion); $('restartDetective').addEventListener('click', startDetective);
      $('miniLessonOptions').addEventListener('click', e => { const b = e.target.closest('button[data-answer]'); if (!b) return; const fb = $('miniLessonFeedback'); fb.classList.add('show'); if (b.dataset.answer === '40') { fb.className = 'feedback show good'; fb.textContent = '🎉 Correct! The minute hand moves 5 minutes for each number, so 8 × 5 = 40 minutes.'; } else { fb.className = 'feedback show try'; fb.textContent = 'Almost! Count by fives: 5, 10, 15… When the long hand points to 8, that is 40 minutes.'; } });
      updateHeader(); updateBuilderClock();
    })();
