/* ====================================================================
 * hub-npc.js — Hub 树突状细胞 NPC 多轮对话系统
 * ==================================================================== */

(function(){
  'use strict';

  var chatHistory = []; // [{role:'user'|'assistant', content}]
  var sending = false;

  // ---- DOM helpers ----

  function $(id){ return document.getElementById(id); }

  function addMessage(role, text){
    var container = $('npc-chat-messages');
    if(!container) return;
    var div = document.createElement('div');
    div.className = 'npc-msg npc-msg-' + (role === 'user' ? 'player' : 'npc');
    div.innerHTML = '<div class="npc-msg-bubble">' + escapeHtml(text) + '</div>';
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return div;
  }

  function addLoading(){
    var container = $('npc-chat-messages');
    if(!container) return null;
    var div = document.createElement('div');
    div.className = 'npc-msg npc-msg-npc npc-msg-loading';
    div.innerHTML = '<div class="npc-msg-bubble">正在思考</div>';
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return div;
  }

  function removeLoading(loadingEl){
    if(loadingEl && loadingEl.parentNode){
      loadingEl.parentNode.removeChild(loadingEl);
    }
  }

  function escapeHtml(text){
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ---- AI Call ----

  async function sendMessage(question){
    if(sending) return;
    sending = true;
    var input = $('npc-chat-input');
    var btn = $('btn-npc-send');
    if(input) input.disabled = true;
    if(btn) btn.disabled = true;

    // Show user message
    addMessage('user', question);
    chatHistory.push({ role: 'user', content: question });

    // Show loading
    var loading = addLoading();

    try {
      var resp = await fetch('/api/npc/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'hub',
          context: {
            cellName: Game.player ? Game.player.cell.name : '白细胞',
            levelName: Game.levelIndex !== undefined ?
              (window.buildLevelConfigs && buildLevelConfigs()[Game.levelIndex] || {}).name || '' : ''
          },
          history: chatHistory.slice(0, -1), // exclude the question just added
          question: question
        })
      });
      var data = await resp.json();
      removeLoading(loading);

      if(data.ok && data.text){
        addMessage('assistant', data.text);
        chatHistory.push({ role: 'assistant', content: data.text });
      } else {
        addMessage('assistant', '抱歉，我的抗原呈递回路暂时短路了...请稍后再试。');
        chatHistory.push({ role: 'assistant', content: '抱歉，请稍后再试。' });
      }
    } catch(e){
      removeLoading(loading);
      addMessage('assistant', '通信链路中断，请检查网络连接后再试。');
      chatHistory.push({ role: 'assistant', content: '通信链路中断。' });
    }

    sending = false;
    if(input){ input.disabled = false; input.focus(); }
    if(btn) btn.disabled = false;
  }

  function showHubNpcChat(){
    // Reset
    var container = $('npc-chat-messages');
    if(container) container.innerHTML = '';

    chatHistory = [];
    sending = false;

    // Welcome message
    addMessage('assistant',
      '你好，免疫战士！我是树突状细胞（DC），免疫系统的侦察兵和科普向导。\n\n' +
      '👉 你可以问我免疫学知识：抗体是什么？\n' +
      '👉 也可以问关卡攻略：Boss怎么打？\n' +
      '👉 或者聊聊疾病机制：病毒和细菌有什么区别？\n\n' +
      '输入框下方有快捷问题，也可以直接打字提问！'
    );

    $('hub-npc-chat').classList.remove('hidden');
    var input = $('npc-chat-input');
    if(input) setTimeout(function(){ input.focus(); }, 300);
  }

  function hideHubNpcChat(){
    $('hub-npc-chat').classList.add('hidden');
  }

  function handleQuickClick(e){
    var btn = e.target.closest('.npc-quick-btn');
    if(!btn) return;
    var q = btn.dataset.q;
    if(q) sendMessage(q);
  }

  function handleKeydown(e){
    if(e.key === 'Enter' && !e.shiftKey){
      e.preventDefault();
      handleSend();
    }
  }

  function handleSend(){
    if(sending) return;
    var input = $('npc-chat-input');
    if(!input) return;
    var q = input.value.trim();
    if(!q) return;
    input.value = '';
    sendMessage(q);
  }

  // ---- Init ----

  function init(){
    var btnNpc = $('btn-hub-npc');
    var btnClose = $('btn-npc-close');
    var btnSend = $('btn-npc-send');
    var input = $('npc-chat-input');
    var quickBtns = $('npc-chat-quick');

    if(btnNpc) btnNpc.addEventListener('click', showHubNpcChat);
    if(btnClose) btnClose.addEventListener('click', hideHubNpcChat);
    if(btnSend) btnSend.addEventListener('click', handleSend);
    if(input) input.addEventListener('keydown', handleKeydown);
    if(quickBtns) quickBtns.addEventListener('click', handleQuickClick);
  }

  // Run on DOM ready
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
