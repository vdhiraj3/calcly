// Calcly script.js - Advanced Scientific Calculator
document.addEventListener('DOMContentLoaded', function(){
  const expEl = document.getElementById('expression');
  const resEl = document.getElementById('result');
  const keys = document.getElementById('keys');
  const historyList = document.getElementById('historyList');
  const emptyState = document.getElementById('emptyState');
  const clearHistoryBtn = document.getElementById('clear-history');
  const downloadHistoryBtn = document.getElementById('download-history');
  const copyResultBtn = document.getElementById('copy-result');
  const yearEl = document.getElementById('year');

  // DEG/RAD buttons (if exist)
  const btnDeg = document.getElementById('btn-deg');
  const btnRad = document.getElementById('btn-rad');
  let angleMode = 'DEG';

  if(btnDeg && btnRad){
    function setAngleMode(mode){
      angleMode = mode;
      btnDeg.classList.toggle('active', mode === 'DEG');
      btnRad.classList.toggle('active', mode === 'RAD');
    }
    btnDeg.addEventListener('click', ()=> setAngleMode('DEG'));
    btnRad.addEventListener('click', ()=> setAngleMode('RAD'));
    setAngleMode('DEG');
  }

  let lastAnswer = null;
  let history = [];

  function placeCaretAtEnd(el) {
    el.focus();
    if (typeof window.getSelection !== "undefined" && typeof document.createRange !== "undefined") {
      var range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  function renderHistory(){
    historyList.innerHTML = '';
    if(history.length === 0){
      historyList.appendChild(emptyState);
      return;
    }
    history.forEach((h, idx) => {
      const li = document.createElement('li');
      li.className = 'history-item';
      li.dataset.index = idx;
      li.innerHTML = '<div><div class="expr">'+escapeHtml(h.expr)+'</div><div class="muted" style="font-size:12px;margin-top:6px">'+h.time+'</div></div><div class="res">'+escapeHtml(h.res)+'</div>';
      li.addEventListener('click', ()=> {
        expEl.textContent = h.expr;
        placeCaretAtEnd(expEl);
      });
      historyList.appendChild(li);
    });
  }

  function escapeHtml(text){
    return String(text).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }

  clearHistoryBtn.addEventListener('click', ()=> {
    history = [];
    renderHistory();
  });

  downloadHistoryBtn.addEventListener('click', ()=> {
    if(history.length === 0) return alert('No history to download.');
    let csv = 'Expression,Result,Time\n';
    history.forEach(h => {
      csv += `"${h.expr.replace(/"/g,'""')}","${h.res}","${h.time}"\n`;
    });
    const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'calc_history.csv'; a.click();
    URL.revokeObjectURL(url);
  });

  keys.addEventListener('click', (e)=>{
    const btn = e.target.closest('button');
    if(!btn) return;
    const action = btn.dataset.action;
    handleKey(action);
  });

  function handleKey(action){
    if(!action) return;
    switch(action){
      case 'C': expEl.textContent=''; resEl.textContent='0'; placeCaretAtEnd(expEl); break;
      case '=': evaluateExpression(); break;
      case 'pi': insertAtCursor('π'); break;
      case 'e': insertAtCursor('e'); break;
      case 'ans': if(lastAnswer !== null) insertAtCursor(String(lastAnswer)); break;
      case 'x2': insertAtCursor('^2'); break;
      case 'xy': insertAtCursor('^('); break;
      case 'sqrt': insertAtCursor('√('); break;
      case 'ln': insertAtCursor('ln('); break;
      case 'log': insertAtCursor('log('); break;
      case 'exp': insertAtCursor('exp('); break;
      case '10x': insertAtCursor('10^('); break;
      case 'sin': case 'cos': case 'tan': insertAtCursor(action+'('); break;
      default: insertAtCursor(action);
    }
    placeCaretAtEnd(expEl);
  }

  function insertAtCursor(text){ expEl.textContent = (expEl.textContent || '') + text; }

  function evaluateExpression(){
    let raw = (expEl.textContent || '').trim();
    if(!raw) return;
    try{
      const val = safeEvaluate(raw);
      lastAnswer = val;
      resEl.textContent = formatResult(val);
      addToHistory(raw, resEl.textContent);
    }catch(err){
      resEl.textContent = 'Error';
      console.error('Eval error', err);
    }
  }

  function formatResult(v){
    if(typeof v === 'number'){
      if(!isFinite(v)) return String(v);
      if(Math.abs(v) < 1e-6 || Math.abs(v) > 1e12) return v.toExponential(9);
      return parseFloat((Math.round((v + Number.EPSILON) * 1e12) / 1e12).toString());
    }
    return String(v);
  }

  function addToHistory(expr, res){
    const now = new Date();
    const time = now.toLocaleString();
    history.unshift({expr, res, time});
    if(history.length > 200) history.pop();
    renderHistory();
  }

  function safeEvaluate(input){
    let expr = input;
    expr = expr.replace(/π/g, 'pi');
    expr = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
    expr = expr.replace(/(\d+(\.\d+)?)%/g, '($1/100)');
    expr = expr.replace(/(\d+|\))!/g, function(m){ const num = m.slice(0,-1); return `fact(${num})`; });
    expr = expr.replace(/√\s*\(/g, 'sqrt(');
    expr = expr.replace(/√\s*([0-9.]+)/g, 'sqrt($1)');
    expr = expr.replace(/(\d)(pi|e|[a-zA-Z\(])/g, '$1*$2');
    expr = expr.replace(/(pi|e|\))(\d|\(|pi|e)/g, '$1*$2');
    expr = expr.replace(/\^/g, '**');
    if(lastAnswer !== null) expr = expr.replace(/\bAns\b/ig, `(${Number(lastAnswer)})`);
    if(!/^[0-9A-Za-z_().+\-*/%^, \t]*$/.test(expr)) throw new Error('Invalid characters');
    const code = `
      "use strict";
      const DEG = ${angleMode === 'DEG' ? 'true' : 'false'};
      const pi = Math.PI;
      const e = Math.E;
      function toRad(x){ return DEG ? (x * Math.PI / 180) : x; }
      function toDeg(x){ return DEG ? (x * 180 / Math.PI) : x; }
      function sin(x){ return Math.sin(toRad(x)); }
      function cos(x){ return Math.cos(toRad(x)); }
      function tan(x){ return Math.tan(toRad(x)); }
      function asin(x){ return toDeg(Math.asin(x)); }
      function acos(x){ return toDeg(Math.acos(x)); }
      function atan(x){ return toDeg(Math.atan(x)); }
      function ln(x){ return Math.log(x); }
      function log(x){ return Math.log10 ? Math.log10(x) : Math.log(x)/Math.LN10; }
      function exp(x){ return Math.exp(x); }
      function sqrt(x){ return Math.sqrt(x); }
      function pow(a,b){ return Math.pow(a,b); }
      function root(a,n){ return Math.pow(a, 1/n); }
      function fact(n){
        n = Number(n);
        if(!isFinite(n) || n < 0) return NaN;
        if(Math.floor(n) !== n) return NaN;
        var res = 1;
        for(var i=2;i<=n;i++) res *= i;
        return res;
      }
      return (${expr});
    `;
    const fn = Function(code);
    return fn();
  }

  // copy result
  copyResultBtn.addEventListener('click', ()=>{
    const text = resEl.textContent || '';
    navigator.clipboard.writeText(text).then(()=> alert('Result copied to clipboard'), ()=> alert('Copy failed'));
  });

  // sanitize input on edit
  expEl.addEventListener('input', ()=> {
    expEl.textContent = expEl.textContent.replace(/\u2212/g,'-');
  });

  renderHistory();
  if(yearEl) yearEl.textContent = new Date().getFullYear();
});
