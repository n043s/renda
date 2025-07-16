/* ------------------------------------------------------------------
   Property Inspector for AutoKey / AutoClick
   ------------------------------------------------------------------ */
   let websocket = null;   // WebSocket to Stream Deck
   let uuid      = null;   // Inspector instance UUID
   let settings  = {};     // 現在の設定保持
   
   /* ───────────────────────────── エントリポイント
      Stream Deck から呼ばれるお約束の関数名。 */
   function connectElgatoStreamDeckSocket(inPort, inUUID, inRegisterEvent,
                                          inInfo, inActionInfo) {
   
     uuid     = inUUID;
     settings = JSON.parse(inActionInfo).payload.settings || {};
   
     websocket = new WebSocket(`ws://127.0.0.1:${inPort}`);
   
     websocket.onopen = () => {
       websocket.send(JSON.stringify({ event: inRegisterEvent, uuid }));
       initUI();               // UI 構築
     };
   
     websocket.onmessage = (evt) => {
       const msg = JSON.parse(evt.data);
       if (msg.event === 'didReceiveSettings') {
         // 他インスタンスから変更された場合など
         settings = msg.payload.settings || {};
         updateUIFromSettings();
       }
     };
   }
   
   /* ───────────────────────────── UI 初期化 */
   function initUI() {
     // 要素取得
     const typeSel  = document.getElementById('type');
     const keyBox   = document.getElementById('key');
     const delayBox = document.getElementById('delay');
   
     updateUIFromSettings();   // まず現在設定を反映
   
     // イベント登録
     typeSel.addEventListener('change', () => {
       // キー/マウスの切替で入力欄の Enabled を制御
       if (typeSel.value === 'key') {
         keyBox.disabled  = false;
         keyBox.placeholder = 'a / enter / f1 …';
       } else {
         keyBox.disabled  = true;
         keyBox.value     = '';
       }
       saveSettings();
     });
   
     keyBox.addEventListener('input',  saveSettings);
     delayBox.addEventListener('input', saveSettings);
   }
   
   /* ───────────────────────────── 設定 → UI 反映 */
   function updateUIFromSettings() {
     const typeSel  = document.getElementById('type');
     const keyBox   = document.getElementById('key');
     const delayBox = document.getElementById('delay');
   
     const storedKey = (settings.key || '').toLowerCase();
   
     if (['left', 'right', 'middle'].includes(storedKey)) {
       // マウス系
       typeSel.value = storedKey;
       keyBox.disabled = true;
       keyBox.value    = '';
     } else {
       // キーボード
       typeSel.value = 'key';
       keyBox.disabled = false;
       keyBox.value    = settings.key || '';
     }
   
     delayBox.value = settings.delay || 100;
   }
   
   /* ───────────────────────────── UI → 設定 反映 */
   function saveSettings() {
     const typeSel  = document.getElementById('type');
     const keyBox   = document.getElementById('key');
     const delayBox = document.getElementById('delay');
   
     // key の決定
     if (typeSel.value === 'key') {
       settings.key = keyBox.value.trim();
     } else {
       settings.key = typeSel.value;            // left/right/middle
     }
     // delay
     settings.delay = parseInt(delayBox.value, 10) || 100;
   
     // Stream Deck へ送信
     websocket.send(JSON.stringify({
       event  : 'setSettings',
       context: uuid,
       payload: settings
     }));
   }
   
   /* 必須: グローバル名前空間へ公開 */
   window.connectElgatoStreamDeckSocket = connectElgatoStreamDeckSocket;