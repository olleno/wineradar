/* Wine Radar: startsidans levande del.
   - "Jag är på en vingård": telefonens läge -> de närmaste vingårdarna (assets/near/<lat>_<lon>.json, rutor om 1 grad) -> "Checka in" öppnar
     vingårdens sida med ?in=1, där checkin.js checkar in direkt.
   - "Just nu" och "Årets upptäckare" från API:t (/feed, /leaderboard) när det finns; annars står de tomma texterna kvar.
   - Veckans utmaning: hur många vingårdar i veckans region man checkat in på den här veckan (från telefonens incheckningar, wr-trip). */
(function(){
  var cfgEl=document.getElementById('wr-home');if(!cfgEl)return;
  var C=JSON.parse(cfgEl.textContent),T=C.t;
  var apiM=document.querySelector('meta[name="wr-api"]'),API=apiM?apiM.content.replace(/\/$/,''):'';
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function fill(s,o){return String(s).replace(/\{(\w+)\}/g,function(_,k){return o[k]!=null?o[k]:'';});}
  function dist(a,b,c,d){var R=6371000,r=Math.PI/180,x=(d-b)*r*Math.cos((a+c)/2*r),y=(c-a)*r;return Math.sqrt(x*x+y*y)*R;}
  function get(u){return fetch(u,{cache:'no-cache'}).then(function(r){if(!r.ok)throw r.status;return r.json();});}
  function flag(cc){cc=String(cc||'').toUpperCase();if(!/^[A-Z]{2}$/.test(cc))return '';return String.fromCodePoint(127397+cc.charCodeAt(0),127397+cc.charCodeAt(1))+' ';}

  /* ---- Jag är på en vingård ---- */
  var box=document.getElementById('near'),st=box&&box.querySelector('.nr-st'),ol=box&&box.querySelector('.nr-list');
  function near(){
    if(!box)return;box.hidden=false;box.scrollIntoView({behavior:'smooth',block:'start'});
    if(!navigator.geolocation){st.textContent=T.nogeo;return;}
    st.textContent=T.locating;ol.innerHTML='';
    navigator.geolocation.getCurrentPosition(function(pos){
      var la=pos.coords.latitude,lo=pos.coords.longitude,cells=[];
      for(var i=-1;i<=1;i++)for(var j=-1;j<=1;j++)cells.push((Math.floor(la)+i)+'_'+(Math.floor(lo)+j));
      Promise.all(cells.map(function(c){return get(C.base+'near/'+c+'.json').catch(function(){return [];});})).then(function(parts){
        var all=[].concat.apply([],parts).map(function(w){return {w:w,m:dist(la,lo,w[0],w[1])};}).filter(function(x){return x.m<30000;});
        all.sort(function(a,b){return a.m-b.m;});
        if(!all.length){st.textContent=T.none_near;return;}
        st.textContent='';
        ol.innerHTML=all.slice(0,8).map(function(x){
          var w=x.w,here=x.m<=w[2]+Math.min(pos.coords.accuracy||0,500),km=x.m<1000?Math.round(x.m)+' m':(x.m/1000).toFixed(1)+' km';
          return '<li><a href="'+esc(w[6])+'"><b>'+esc(w[3])+'</b></a> <span class="muted">'+esc(w[4])+' · '+esc(w[5])+' · '+km+'</span>'+
                 (here?' <a class="btn" href="'+esc(w[6])+'?in=1">'+esc(T.checkin)+'</a>':'')+'</li>';
        }).join('');
      });
    },function(){st.textContent=T.nogeo;},{enableHighAccuracy:true,timeout:15000,maximumAge:0});
  }
  document.querySelectorAll('[data-near]').forEach(function(a){a.addEventListener('click',function(e){e.preventDefault();near();});});
  if(location.hash==='#near')near();

  /* ---- Just nu ---- */
  var fl=document.querySelector('#live .feed-list');
  if(API&&fl){
    get(API+'/feed').then(function(d){
      var ev=(d.checkins||[]).map(function(x){return {day:x.day,h:fill(T.ev_checkin,{nick:flag(x.country)+esc(x.nick),name:'<a href="'+esc(x.url)+'">'+esc(x.name)+'</a>'})+' <span class="muted">'+esc(x.town)+' · '+esc(x.day)+'</span>'};})
        .concat((d.tips||[]).map(function(x){return {day:x.day,h:fill(T.ev_tip,{name:'<a href="'+esc(x.url)+'">'+esc(x.name)+'</a>'})+': “'+esc(String(x.text).slice(0,110))+'” <span class="muted">'+esc(x.nick||T.anon)+' · '+esc(x.day)+'</span>'};}));
      ev.sort(function(a,b){return a.day<b.day?1:-1;});
      if(ev.length)fl.innerHTML=ev.slice(0,10).map(function(e){return '<li>'+e.h+'</li>';}).join('');
    }).catch(function(){});
  }

  /* ---- Årets upptäckare ---- */
  var el=document.querySelector('#live .ex-list');
  if(API&&el){
    get(API+'/leaderboard').then(function(d){
      var L=(d.explorers||[]).slice(0,5);
      if(L.length)el.innerHTML=L.map(function(x){return '<li>'+flag(x.country)+'<b>'+esc(x.nick)+'</b> <span class="num">'+x.n+'</span></li>';}).join('');
    }).catch(function(){});
  }

  /* ---- Veckans utmaning ---- */
  var cp=document.querySelector('#live .ch-prog');
  if(cp&&C.ch){
    var v={};try{v=JSON.parse(localStorage.getItem('wr-trip')||'{}')||{};}catch(e){}
    var now=new Date(),mon=new Date(now);mon.setDate(now.getDate()-((now.getDay()+6)%7));
    var from=mon.getFullYear()+'-'+('0'+(mon.getMonth()+1)).slice(-2)+'-'+('0'+mon.getDate()).slice(-2);
    var n=Object.keys(v).filter(function(k){var x=v[k];return x&&x.rs===C.ch.slug&&x.d>=from;}).length;
    cp.textContent=n>=3?T.ch_done:fill(T.ch_prog,{n:n});
  }
})();
