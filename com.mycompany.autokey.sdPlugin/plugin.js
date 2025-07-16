/* ──────────────────────────────────────────────────────────────
   Stream Deck Plugin  : AutoKey / AutoClick  (nut-js 版)
   --------------------------------------------------------------
   ・ボタン 1 回押し → 連打開始
   ・もう一度押し   → 停止
   ・設定
        key   = 'a' | 'enter' | 'f1' … / 'left' | 'right' | 'middle'
        delay = ミリ秒
   ・依存
        npm i --production @nut-tree/nut-js
     ── C/C++ ビルドツールは不要
   -------------------------------------------------------------- */

   const { keyboard, mouse, Key, Button } = require('@nut-tree/nut-js');
   keyboard.config.autoDelayMs = 0;
   mouse.config.autoDelayMs    = 0;
   
   /* ────────────────────────── グローバル */
   let websocket  = null;          // Stream Deck との WebSocket
   let pluginUUID = null;          // プラグインインスタンス UUID
   const timers   = {};            // context → setInterval ID
   
   /* ────────────────────────── Stream Deck SDK エントリ */
   function connectElgatoStreamDeckSocket(inPort, inPluginUUID,
                                          inRegisterEvent, inInfo) {
   
     pluginUUID = inPluginUUID;
     websocket  = new WebSocket(`ws://127.0.0.1:${inPort}`);
   
     websocket.onopen = () =>
       websocket.send(JSON.stringify({ event: inRegisterEvent, uuid: pluginUUID }));
   
     websocket.onmessage = (ev) => {
       const msg = JSON.parse(ev.data);
       const { event, context, payload } = msg;
   
       switch (event) {
         case 'keyDown':
           toggleRun(context, payload.settings);
           break;
   
         case 'willAppear':
           setTitle(context, 'OFF');
           break;
   
         case 'willDisappear':
           stopRun(context);
           break;
   
         case 'didReceiveSettings':
           // U I 変更を即時反映したい場合に利用
           break;
       }
     };
   }
   
   /* ────────────────────────── 連打制御 */
   function toggleRun(context, settings = {}) {
     if (timers[context]) {
       // 動作中 → 停止
       stopRun(context);
       return;
     }
   
     const keyRaw = (settings.key || '').toLowerCase();
     const delay  = Number(settings.delay) > 0 ? Number(settings.delay) : 100;
     if (!keyRaw) return;   // 設定なし
   
     timers[context] = setInterval(async () => {
       try {
         if (['left', 'right', 'middle'].includes(keyRaw)) {
           // マウスクリック
           await mouse.click(mapButton(keyRaw));
         } else {
           // キーボード
           const mapped = mapKey(keyRaw);
           if (mapped) await keyboard.type(mapped);
           else        await keyboard.type(keyRaw);
         }
       } catch (err) {
         console.error('nut-js error:', err);
       }
     }, delay);
   
     setTitle(context, 'ON');
   }
   
   function stopRun(context) {
     if (timers[context]) {
       clearInterval(timers[context]);
       delete timers[context];
       setTitle(context, 'OFF');
     }
   }
   
   /* ────────────────────────── ヘルパ */
   function setTitle(context, title) {
     if (!websocket) return;
     websocket.send(JSON.stringify({
       event  : 'setTitle',
       context: context,
       payload: { title, target: 0 }
     }));
   }
   
   /* nut-js 用キー／ボタン変換 */
   function mapButton(name) {
     return { left: Button.LEFT, right: Button.RIGHT, middle: Button.MIDDLE }[name];
   }
   
   function mapKey(name) {
     // Key 列挙子名はすべて大文字
     const upper = name.toUpperCase();
     return Key[upper] || null;
   }
   
   /* ────────────────────────── グローバル公開 (必須) */
   global.connectElgatoStreamDeckSocket = connectElgatoStreamDeckSocket;