/* 怪獸訓練紀錄 — 自動化測試（由 run_tests.py 與 index.html 內的程式一起載入執行）
   同步測試直接跑；雲端同步測試用記憶體中的假 Supabase（MockDB），不會碰到真正的雲端。 */
var __R=[];
function eq(a,b){var A=JSON.stringify(a),B=JSON.stringify(b);return A===B?true:('預期 '+B+'，實際 '+A);}
function T(name,fn){try{var r=fn();__R.push({name:name,ok:r===true,detail:r===true?'':String(r)});}catch(e){__R.push({name:name,ok:false,detail:'例外：'+e});}}
async function AT(name,fn){try{var r=await fn();__R.push({name:name,ok:r===true,detail:r===true?'':String(r)});}catch(e){__R.push({name:name,ok:false,detail:'例外：'+e+' '+(e&&e.stack||'')});}}
function resetLocal(){localStorage.removeItem(LOCAL_KEY);localStorage.removeItem(TOMB_KEY);for(var k in RENDERED)delete RENDERED[k];__derivedSig=null;}

var SAMPLE="2026/06/06\n跨步上下伸展側旋\n站姿早安槓鈴6*2  40 50\n坐姿頸後肩推板凳水管\n傳統硬舉槓鈴5*3*3*3 60 80 90 95\n肩推槓鈴8*3  30 35 35（10）\n屈體划船槓鈴8*3\n負重跨步蹲 30步\n\n06/13\n高跪外開下壓8\n高跪前伸上畫圓8\n伏地挺身 地墊 10\n壺鈴分腿蹲 5\n握把蹲SSB 5*3 75 95 105\n坐姿啞鈴單手肩推8*2 10\n槓鈴划船8*2  25\nRDL槓鈴8*3 25 35 45\n熊爬\n\n6/20\n毛蟲6\n殼式前推8\n槓片15p繞身、過頭分腿蹲\nSSB握把蹲5*3*3*3 87 107 127 137\n啞鈴肩推6*4 12.5 \n海豹划船槓鈴板凳墊高 6*3 20\n壺鈴硬舉6*3 24\n仰臥下躺\n\n6/27\n殼式上維持\n高跪維持（膝蓋離地）\n頸後肩推槓鈴5*2 20 22.5\n單腳RDL壺鈴8*2 10\n低箱蹲槓鈴30cm 5*3 60 70 80\n地板臥推槓鈴5*3 40 50 60\n彈力帶下拉單手\n壺鈴擺盪 15*3 16";

/* ───────── 訓練量計算 ───────── */
T('訓練量：239 筆歷史資料重算誤差都 ≤1 kg（四捨五入規則差異）',function(){
  var bad=ALL_SESSIONS.filter(function(s){return Math.abs(sessionVolumeJS(s.content)-s.volume)>1;});
  return bad.length===0?true:('誤差>1 的有 '+bad.length+' 筆，例如 '+JSON.stringify(bad[0]));
});
T('最高組重量擷取：傳統硬舉 5*3*3*3 60 80 90 95 → 95',function(){return eq(maxLiftWeight('傳統硬舉槓鈴5*3*3*3 60 80 90 95 ｜ 臥推 5*3 40 50',['傳統硬舉']),95);});
T('進步曲線：「握把蹲SSB」「硬舉六角槓」等常見寫法也會納入對應曲線',function(){
  resetLocal();CLOUD_ON=false;
  persistRecords([{year:2027,date:'2/1',full_date:'2027/02/01',content:'握把蹲SSB 5*3 75 95 105 ｜ 硬舉六角槓 5*3 70 90 100',volume:0}]);
  var get=function(t){var c=CHARTS_DATA.filter(function(x){return x.title.indexOf(t)===0;})[0];var i=c.labels.indexOf('2027/02/01');return i<0?null:c.data[i];};
  var r=eq([get('SSB握把蹲'),get('六角槓硬舉'),get('臥推')],[105,100,null]);resetLocal();recomputeDerived(true);return r;
});
T('最高組重量擷取：沒有該動作 → 0',function(){return eq(maxLiftWeight('臥推 5*3 40 50',['傳統硬舉']),0);});

/* ───────── 日期 ───────── */
T('validYMD：閏年／非閏年／月份超出',function(){return eq([validYMD(2024,2,29),validYMD(2026,2,29),validYMD(2026,13,1),validYMD(2026,4,31)],[true,false,false,false]);});
T('matchDateLine：各種日期寫法',function(){
  return eq([matchDateLine('2026/06/06'),matchDateLine('06/13'),matchDateLine('6/20(六)'),matchDateLine('6/20（六）'),matchDateLine('2026-6-5')],
    [{y:2026,m:6,d:6},{y:null,m:6,d:13},{y:null,m:6,d:20},{y:null,m:6,d:20},{y:2026,m:6,d:5}]);
});
T('matchDateLine：不是日期的行回傳 null',function(){return eq([matchDateLine('13/40'),matchDateLine('傳統硬舉5*3'),matchDateLine('5*3'),matchDateLine('6/20 硬舉'),matchDateLine('')],[null,null,null,null,null]);});

/* ───────── 批次貼上 ───────── */
T('批次貼上：使用者範例切成 4 天，日期／動作數／訓練量正確',function(){
  var r=parseBulkSessions(SAMPLE,2026);
  return eq(r.map(function(x){return [x.full_date,x.content.split('｜').length,x.volume];}),
    [['2026/06/06',7,2435],['2026/06/13',9,2775],['2026/06/20',8,2640],['2026/06/27',8,2218]]);
});
T('批次貼上：12 月→1 月自動跨年',function(){
  return eq(parseBulkSessions('12/20\nA 5*3 50\n1/3\nB 5*3 50',2025).map(function(x){return x.full_date;}),['2025/12/20','2026/01/03']);
});
T('批次貼上：新到舊倒序貼（7 月→6 月）不會被誤判成隔年',function(){
  return eq(parseBulkSessions('7/5\nA 5*3 50\n6/27\nB 5*3 50',2026).map(function(x){return x.full_date;}),['2026/07/05','2026/06/27']);
});
T('批次貼上：明確寫年份的日期優先',function(){
  return eq(parseBulkSessions('2025/12/30\nA\n1/2\nB',2020).map(function(x){return x.full_date;}),['2025/12/30','2026/01/02']);
});
T('批次貼上：不合法日期（13/40）當成動作文字，不會變成新的一天',function(){
  var r=parseBulkSessions('6/1\nA 5*3 50\n13/40\nB',2026);
  return eq([r.length,r[0].content],[1,'A 5*3 50 ｜ 13/40 ｜ B']);
});
T('批次貼上：第一個日期前的行數會回報（ignored）',function(){
  var r=parseBulkSessions('沒日期的筆記\n6/1\nA',2026);return eq([r.length,r.ignored],[1,1]);
});
T('批次貼上：只有日期沒有動作的天會略過',function(){return eq(parseBulkSessions('6/1\n6/2\nA',2026).map(function(x){return x.full_date;}),['2026/06/02']);});

/* ───────── CSV／JSON 匯入匯出 ───────── */
T('CSV 解析：引號內逗號、換行、跳脫引號、BOM、CRLF',function(){
  var rows=parseCSVText('﻿年份,內容\r\n2026,"a,b ""q""\nc"\r\n');
  return eq(rows,[['年份','內容'],['2026','a,b "q"\nc']]);
});
T('normalizeRec：2026-6-5 → 2026/06/05、年份由日期決定',function(){
  var r=normalizeRec({year:'1999',full_date:'2026-6-5',content:' 硬舉 5*3 60 ',volume:''});
  return eq([r.year,r.date,r.full_date,r.content,r.volume],[2026,'6/5','2026/06/05','硬舉 5*3 60',sessionVolumeJS('硬舉 5*3 60')]);
});
T('normalizeRec：不合法日期 → full_date 為空（會被略過）',function(){return eq([normalizeRec({full_date:'2026/02/30',content:'x'}).full_date,normalizeRec({full_date:'abc',content:'x'}).full_date],['','']);});
T('匯出 CSV：開頭 = + - @ 會加 \' 防公式執行，且匯入時還原',function(){
  return eq([csvCell('=SUM(A1)'),csvCell('硬舉 "5*3"'),normalizeRec({full_date:'2026/1/1',content:"'=SUM(A1)"}).content],['"\'=SUM(A1)"','"硬舉 ""5*3"""','=SUM(A1)']);
});
T('匯出：不帶內部欄位 _synced/_id',function(){return eq(Object.keys(publicRec({year:1,date:'1/1',full_date:'x',content:'c',volume:2,_synced:true,_id:'z'})).sort(),['content','date','full_date','volume','year']);});
T('完整 CSV 匯出→匯入往返資料不變',function(){
  var src=[{year:2026,date:'6/6',full_date:'2026/06/06',content:'硬舉 5*3 60, "加重" ｜ 臥推',volume:900}];
  var csv=['年份,日期,完整日期,訓練內容,訓練量(kg)'].concat(src.map(function(s){return [s.year,s.date,s.full_date,csvCell(s.content),s.volume].join(',');})).join('\r\n');
  return eq(parseImportCSV(csv),src);
});

/* ───────── 安全性 ───────── */
T('escapeHTML：標籤與引號都會跳脫',function(){return eq(escapeHTML('<img src=x onerror="a(\'1\')">&'),'&lt;img src=x onerror=&quot;a(&#39;1&#39;)&quot;&gt;&amp;');});
T('雲端資料檢查：date 欄位的惡意 HTML 不會被使用（日期由 full_date 重建）',function(){
  var r=sanitizeRow({id:'a',year:'<b>',date:'<img src=x onerror=alert(1)>',full_date:'2026/06/06',content:'A 5*3 50',volume:750});
  return eq([r.year,r.date,r.full_date,r._synced],[2026,'6/6','2026/06/06',true]);
});
T('雲端資料檢查：格式不符的列一律丟棄',function(){
  return eq([sanitizeRow({full_date:'<script>',content:'x'}),sanitizeRow({full_date:'2026/02/30',content:'x'}),sanitizeRow({full_date:'2026/06/06',content:''}),sanitizeRow({full_date:'2026/06/06',content:new Array(5002).join('x')})],[null,null,null,null]);
});
T('雲端資料檢查：訓練量不是數字時自動重算',function(){return eq(sanitizeRow({full_date:'2026/06/06',content:'A 5*3 50',volume:'abc'}).volume,sessionVolumeJS('A 5*3 50'));});

/* ───────── 統計（與原本 HTML 內的數字一致） ───────── */
T('年度統計：沒有新增紀錄時與原本頁面上的數字完全一致',function(){
  resetLocal();var st=yearStats(),bad=[];
  Object.keys(__BAKED.years).forEach(function(y){
    var b=__BAKED.years[y],o=st[y];
    var got={n:o.n,vol:o.vol,avg:Math.round(o.vol/o.n),max:o.max,min:o.min};
    if(JSON.stringify(got)!==JSON.stringify(b))bad.push(y+':'+JSON.stringify(got)+'≠'+JSON.stringify(b));
  });
  return bad.length?bad.join('; '):true;
});
T('長條圖高度公式與原本頁面一致',function(){
  resetLocal();var st=yearStats(),maxN=0;Object.keys(st).forEach(function(y){maxN=Math.max(maxN,st[y].n);});
  var bad=[];Object.keys(__BAKED.bars).forEach(function(y){var h=Math.max(4,Math.floor(st[y].n/maxN*80));if(h!==__BAKED.bars[y])bad.push(y+':'+h+'≠'+__BAKED.bars[y]);});
  return bad.length?bad.join('; '):true;
});

/* ───────── 本機儲存（不連雲端） ───────── */
T('persistRecords：同一批重複只存一次、與歷史重複不存',function(){
  resetLocal();CLOUD_ON=false;
  var a={year:2027,date:'1/5',full_date:'2027/01/05',content:'A 5*3 50',volume:750};
  var b={year:2027,date:'1/6',full_date:'2027/01/06',content:'B 5*3 50',volume:750};
  var n1=persistRecords([a,a,b]),n2=persistRecords([a]),n3=persistRecords([ALL_SESSIONS[0]]);
  return eq([n1,n2,n3,loadLocal().length,loadLocal()[0]._synced],[2,0,0,2,false]);
});
T('年度統計會納入新增紀錄',function(){var st=yearStats();return eq([st['2027'].n,st['2027'].vol],[2,1500]);});
T('localStorage 寫入失敗不會讓程式當掉',function(){
  var orig=localStorage.setItem;localStorage.setItem=function(){throw new Error('QuotaExceeded');};
  try{var ok=saveLocal([{a:1}]);return eq(ok,false);}finally{localStorage.setItem=orig;}
});
T('localStorage 內容損毀時讀成空陣列',function(){localStorage.setItem(LOCAL_KEY,'{壞掉');var r=loadLocal();localStorage.removeItem(LOCAL_KEY);return eq(r,[]);});

/* ───────── 雲端同步（假 Supabase） ───────── */
function MockDB(){this.rows=[];this.seq=0;this.failInsert=false;this.failDelete=false;this.failSelect=false;this.calls={select:0,insert:0,delete:0};}
MockDB.prototype.client=function(){var db=this;return {from:function(){return new MQ(db);}};};
function MQ(db){this.db=db;this.op='select';this.f=[];this.rng=null;this.payload=null;}
MQ.prototype.select=function(){return this;};
MQ.prototype.order=function(){return this;};
MQ.prototype.range=function(a,b){this.rng=[a,b];return this;};
MQ.prototype.insert=function(p){this.op='insert';this.payload=p;return this;};
MQ.prototype.delete=function(){this.op='delete';return this;};
MQ.prototype.eq=function(k,v){this.f.push([k,v]);return this;};
MQ.prototype.then=function(ok,ng){var self=this;return Promise.resolve().then(function(){return self.run();}).then(ok,ng);};
MQ.prototype.run=function(){
  var db=this.db,f=this.f;db.calls[this.op]++;
  if(this.op==='select'){if(db.failSelect)return {data:null,error:{message:'離線'}};
    var rows=db.rows.slice().sort(function(a,b){return a.id<b.id?-1:1;});if(this.rng)rows=rows.slice(this.rng[0],this.rng[1]+1);
    return {data:JSON.parse(JSON.stringify(rows)),error:null};}
  if(this.op==='insert'){if(db.failInsert)return {data:null,error:{message:'離線'}};
    var out=this.payload.map(function(p){var r=JSON.parse(JSON.stringify(p));r.id='id'+String(++db.seq).padStart(6,'0');db.rows.push(r);return r;});
    return {data:JSON.parse(JSON.stringify(out)),error:null};}
  if(this.op==='delete'){if(db.failDelete)return {data:null,error:{message:'離線'}};
    db.rows=db.rows.filter(function(r){return !f.every(function(x){return r[x[0]]===x[1];});});return {data:null,error:null};}
};
function rec(fd,c){var p=fd.split('/');return {year:+p[0],date:(+p[1])+'/'+(+p[2]),full_date:fd,content:c,volume:sessionVolumeJS(c)};}
function countKey(db,r){return db.rows.filter(function(x){return recKey(x)===recKey(r);}).length;}
function useMock(){var db=new MockDB();SB=db.client();CLOUD_ON=true;window.MONSTER_CONFIG={SUPABASE_URL:'https://mock.supabase.co',SUPABASE_ANON_KEY:'k'};resetLocal();return db;}

(async function(){
  await AT('雲端拉取：合併雲端資料、丟棄格式錯誤列、略過與歷史重複',async function(){
    var db=useMock();
    db.rows.push({id:'id000001',year:2027,date:'1/5',full_date:'2027/01/05',content:'A 5*3 50',volume:750});
    db.rows.push({id:'id000002',year:2027,date:'<img src=x onerror=alert(1)>',full_date:'2027/01/06',content:'<script>x</script> B 5*3 50',volume:750});
    db.rows.push({id:'id000003',full_date:'壞資料',content:'x'});
    db.rows.push(Object.assign({id:'id000004'},ALL_SESSIONS[0]));db.seq=4;
    await cloudPull();
    var c=loadLocal().map(function(r){return [r.full_date,r.date,r._synced];}).sort();
    return eq(c,[['2027/01/05','1/5',true],['2027/01/06','1/6',true]]);
  });
  await AT('新增後上傳雲端並標記已同步（一次 API 呼叫上傳多筆）',async function(){
    var db=useMock();
    persistRecords([rec('2027/02/01','A 5*3 50'),rec('2027/02/02','B 5*3 50'),rec('2027/02/03','C 5*3 50')]);
    await __cloudQ;
    return eq([db.rows.length,db.calls.insert,loadLocal().every(function(r){return r._synced&&r._id;})],[3,1,true]);
  });
  await AT('另一台裝置刪除的紀錄，本機同步後也會消失',async function(){
    var db=useMock();var a=rec('2027/03/01','A 5*3 50'),b=rec('2027/03/02','B 5*3 50');
    persistRecords([a,b]);await __cloudQ;
    db.rows=db.rows.filter(function(r){return r.full_date!=='2027/03/01';});   /* 模擬別台裝置刪除 */
    await cloudPull();
    return eq(loadLocal().map(function(r){return r.full_date;}),['2027/03/02']);
  });
  await AT('安全閥：雲端突然整個是空的（設定／連線異常）不會清掉本機已同步的資料',async function(){
    var db=useMock();var list=[];for(var i=1;i<=6;i++)list.push(rec('2027/04/0'+i,'A'+i+' 5*3 50'));
    persistRecords(list);await __cloudQ;db.rows=[];
    await cloudPull();
    return eq(loadLocal().length,6);
  });
  await AT('離線刪除：雲端刪除失敗時不會在下次同步「復活」，恢復連線後補刪',async function(){
    var db=useMock();var a=rec('2027/05/01','A 5*3 50');
    persistRecords([a]);await __cloudQ;
    db.failDelete=true;
    deleteRecord({closest:function(){return {getAttribute:function(){return recKey(a);}};}});
    await __cloudQ;
    var stillInCloud=countKey(db,a),tombAfterFail=loadJSON(TOMB_KEY).length;
    await cloudPull();
    var notBack=loadLocal().length===0;
    db.failDelete=false;await cloudPull();
    return eq([stillInCloud,tombAfterFail,notBack,countKey(db,a),loadJSON(TOMB_KEY).length],[1,1,true,0,0]);
  });
  await AT('上傳失敗（離線）：保留在本機，下次同步自動補傳',async function(){
    var db=useMock();var a=rec('2027/06/01','A 5*3 50');
    db.failInsert=true;persistRecords([a]);await __cloudQ;
    var before=[db.rows.length,loadLocal()[0]._synced];
    db.failInsert=false;await cloudPull();
    return eq([before,db.rows.length,loadLocal()[0]._synced],[[0,false],1,true]);
  });
  await AT('同時「新增」與「同步」不會在雲端產生重複資料（兩種先後順序）',async function(){
    var db=useMock();var a=rec('2027/07/01','A 5*3 50'),b=rec('2027/07/02','B 5*3 50');
    persistRecords([a]);cloudPull();await __cloudQ;
    cloudPull();persistRecords([b]);await __cloudQ;
    return eq([countKey(db,a),countKey(db,b)],[1,1]);
  });
  await AT('連點同步：多次觸發只排一次拉取',async function(){
    var db=useMock();cloudPull();cloudPull();cloudPull();await __cloudQ;return eq(db.calls.select,1);
  });
  await AT('雲端超過 1000 筆時分頁抓完整',async function(){
    var db=useMock();for(var i=0;i<2500;i++)db.rows.push({id:'id'+String(i+1).padStart(6,'0'),full_date:'2028/01/01',content:'R'+i,volume:0});
    db.seq=2500;var rows=await fetchAllRows();return eq([rows.length,db.calls.select],[2500,3]);
  });
  await AT('雲端讀取失敗時保留本機資料，不拋出例外',async function(){
    var db=useMock();persistRecords([rec('2027/08/01','A 5*3 50')]);await __cloudQ;db.failSelect=true;
    await cloudPull();return eq(loadLocal().length,1);
  });

  /* 寫出結果 */
  ObjC.import('Foundation');
  var out=$.NSProcessInfo.processInfo.environment.objectForKey('MONSTER_TEST_OUT').js;
  $(JSON.stringify(__R)).writeToFileAtomicallyEncodingError(out,true,$.NSUTF8StringEncoding,null);
})();
'sync-tests-done';
