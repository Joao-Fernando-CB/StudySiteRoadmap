let totalXP = 0, level = 1, currentModule = null, currentQuestionIndex = 0, userAnswers = [];
let modulos = [];
let perguntas = [];

// ---------------- Carregar JSONs ----------------
async function loadJSONs() {
  try {
    const modulosResponse = await fetch('./modulos.json');
    modulos = await modulosResponse.json();
    const perguntasResponse = await fetch('./perguntas.json');
    perguntas = await perguntasResponse.json();
  } catch (err) {
    console.error('Erro ao carregar JSONs:', err);
  }
}

// ---------------- Função de Inicialização ----------------
async function init() {
  await loadJSONs();   // carrega modulos.json e perguntas.json
  loadRoadmap();       // gera os cards e checkboxes dinamicamente
  // ⚠️ Restaurar progresso apenas depois das checkboxes existirem
  setTimeout(loadProgress, 50); 
}


// ---------------- Gerar os Cards ----------------
function loadRoadmap(){
  const container = document.getElementById('cards-container');
  container.innerHTML = '';

  modulos.forEach((module, index) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.background = `linear-gradient(135deg, ${module.color}40, ${module.color}70)`;

    // Criar listas de tarefas com checkboxes com id único
    let counter = 0;
    const createList = arr => arr.map(item => {
      const id = `checkbox-${index}-${counter++}`;
      return `<li><input type="checkbox" id="${id}" class="progress-checkbox mr-2" onchange="updateProgress()">${item}</li>`;
    }).join('');

    const readings = createList(module.tasks.readings);
    const projects = createList(module.tasks.projects);
    const goals = createList(module.tasks.goals);

    card.innerHTML = `
      <div class="flex justify-between items-center p-5">
        <h2 class="text-xl font-bold text-white">${module.title}</h2>
        <button id="btn-${index}" class="text-white font-bold text-2xl" onclick="toggleCard(event,${index})">+</button>
      </div>
      <div class="p-2">
        <div class="w-full bg-gray-600 rounded-full h-2">
          <div id="mini-progress-${index}" class="progress-bar" style="width:0%; background:${module.color}"></div>
        </div>
      </div>
      <div class="card-body p-5 text-white">
        <h3 class="font-semibold mb-2">Leituras:</h3><ul>${readings}</ul>
        <h3 class="font-semibold mb-2">Projetos:</h3><ul>${projects}</ul>
        <h3 class="font-semibold mb-2">Metas:</h3><ul>${goals}</ul>
        <button class="mt-3 px-3 py-1 bg-white text-black rounded font-bold" onclick="openQuiz(${index})">Finalizar módulo (quiz obrigatório)</button>
      </div>
      <div id="badge-${index}" class="badge">Badge desbloqueado!</div>
    `;
    container.appendChild(card);
  });

  // Agora todos os cards e checkboxes estão criados → carregar progresso
  loadProgress();
  updateProgress();
}

// ---------------- Toggle Cards ----------------
function toggleCard(e,index){
  e.stopPropagation();
  document.querySelectorAll('.card').forEach((card,i)=>{
    const btn=document.getElementById(`btn-${i}`);
    if(i===index){card.classList.toggle('active');btn.textContent=card.classList.contains('active')?"−":"+";}
    else{card.classList.remove('active');btn.textContent="+";}
  });
}

// ---------------- Abrir Quiz ----------------
function openQuiz(moduleIndex){
  currentModule=moduleIndex;
  const quiz=perguntas.find(q=>q.moduleId===moduleIndex+1);
  if(!quiz) return;
  document.getElementById('quiz-title').textContent=`${quiz.title}`;
  userAnswers=Array(quiz.questions.length).fill(null);
  currentQuestionIndex=0;
  showQuestion(quiz);
  document.getElementById('quiz-modal').classList.add('show');
}

// ---------------- Mostrar Questão ----------------
function showQuestion(quiz){
  const container=document.getElementById('quiz-question-container');
  container.innerHTML='';
  const q=quiz.questions[currentQuestionIndex];
  const div=document.createElement('div'); div.className='space-y-2';
  div.innerHTML=`<div class="font-semibold text-gray-800">${q.q}</div>`;
  
  q.options.forEach((opt,i)=>{
    const btn=document.createElement('div'); btn.className='option'; btn.textContent=opt;
    if(userAnswers[currentQuestionIndex]!==null){
      if(i===q.answer) btn.classList.add('correct');
      else if(i===userAnswers[currentQuestionIndex]) btn.classList.add('wrong');
    }
    btn.onclick=()=>{
      if(userAnswers[currentQuestionIndex]===null){
        userAnswers[currentQuestionIndex]=i;
        if(i===q.answer) btn.classList.add('correct'); else btn.classList.add('wrong');
      }
    };
    div.appendChild(btn);
  });
  container.appendChild(div);
  
  document.getElementById('prev-question').style.display=currentQuestionIndex>0?'inline-block':'none';
  document.getElementById('next-question').style.display=currentQuestionIndex<quiz.questions.length-1?'inline-block':'none';
  document.getElementById('finish-quiz').style.display=currentQuestionIndex===quiz.questions.length-1?'inline-block':'none';
}

// ---------------- Navegação Quiz ----------------
document.getElementById('next-question').onclick = ()=>{
  currentQuestionIndex++; 
  showQuestion(perguntas.find(q=>q.moduleId===currentModule+1));
}
document.getElementById('prev-question').onclick = ()=>{
  currentQuestionIndex--; 
  showQuestion(perguntas.find(q=>q.moduleId===currentModule+1));
}
document.getElementById('finish-quiz').onclick = ()=>{
  const quiz=perguntas.find(q=>q.moduleId===currentModule+1);
  const allCorrect=userAnswers.every((ans,i)=>ans===quiz.questions[i].answer);
  if(allCorrect) unlockBadge();
  document.getElementById('quiz-modal').classList.remove('show');
}
document.getElementById('close-modal').onclick = ()=>{
  document.getElementById('quiz-modal').classList.remove('show');
}

// ---------------- Desbloquear Badge ----------------
function unlockBadge(){
  const badge=document.getElementById(`badge-${currentModule}`);
  badge.classList.add('show');
  confetti({particleCount:120,spread:80,origin:{y:0.6}});
  totalXP+=50; 
  updateProgress();
}

// ---------------- Atualizar Progresso ----------------
function updateProgress(){
  document.getElementById('xp').textContent = totalXP;
  level = Math.floor(totalXP / 100) + 1;
  document.getElementById('level').textContent = level;

  // Progresso dos módulos
  modulos.forEach((mod,index)=>{
    const checkboxes=document.querySelectorAll(`#cards-container .card:nth-child(${index+1}) input[type=checkbox]`);
    const total=checkboxes.length;
    const checked=[...checkboxes].filter(cb=>cb.checked).length;
    const percent=total?Math.round((checked/total)*100):0;
    document.getElementById(`mini-progress-${index}`).style.width=percent+'%';
  });

  // Progresso global
  const allCheckboxes=document.querySelectorAll('.progress-checkbox');
  const totalGlobal=allCheckboxes.length;
  const checkedGlobal=[...allCheckboxes].filter(cb=>cb.checked).length;
  const globalPercent=totalGlobal?Math.round((checkedGlobal/totalGlobal)*100):0;
  document.getElementById('global-progress').style.width=globalPercent+'%';

  saveProgress();
}

// ---------------- Salvar Progresso ----------------
function saveProgress() {
  const allCheckboxes = document.querySelectorAll('.progress-checkbox');
  const checkedStates = {};
  allCheckboxes.forEach(cb => { checkedStates[cb.id] = cb.checked; });
  localStorage.setItem('progressCheckboxes', JSON.stringify(checkedStates));
  localStorage.setItem('totalXP', totalXP);
}

// ---------------- Carregar Progresso ----------------
function loadProgress() {
  const savedCheckboxes = JSON.parse(localStorage.getItem('progressCheckboxes') || '{}');
  const allCheckboxes = document.querySelectorAll('.progress-checkbox');

  allCheckboxes.forEach(cb => {
    if (savedCheckboxes[cb.id]) cb.checked = true;
  });

  totalXP = parseInt(localStorage.getItem('totalXP') || '0');
}


// ---------------- Resetar Progresso ----------------
document.getElementById('resetProgress').onclick = () => {
  const checkboxes = document.querySelectorAll('.progress-checkbox');
  checkboxes.forEach(cb => cb.checked = false);
  totalXP = 0;
  localStorage.removeItem('progressCheckboxes');
  localStorage.removeItem('totalXP');
  updateProgress();
};

// ---------------- Inicializar ----------------
init();