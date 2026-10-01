(function(){
  var WR=window.WR={};
  var cs=getComputedStyle(document.documentElement);
  function c(n){return cs.getPropertyValue(n).trim();}
  WR.col=function(){return {accent:c('--accent'),vine:c('--vine'),lake:c('--lake'),land:c('--land'),road:c('--road'),muted:c('--muted'),surface:c('--surface'),gold:c('--gold'),stay:c('--stay')};};
  WR.esc=function(s){return String(s==null?'':s).replace(/[&<>"]/g,function(ch){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch];});};
  WR.map=function(el){
    var col=WR.col();
    var map=L.map(el,{zoomSnap:0.5,minZoom:8,maxZoom:16,scrollWheelZoom:false});
    map.attributionControl.setPrefix(false);
    map.attributionControl.addAttribution('Natural Earth · © OpenStreetMap contributors · Falstaff · Burgenland Tourismus');
    if(window.WR_TILES&&L.maplibreGL){
      /* real street map (OpenFreeMap, free vector tiles) on the live site */
      L.maplibreGL({style:window.WR_TILES,attribution:'<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> © OpenMapTiles © OpenStreetMap'}).addTo(map);
    }else{
      /* fallback: our own drawn map (used in the preview, where outside map tiles are blocked) */
      var B=window.WR_BASE||{};
      if(B.bgl)L.geoJSON(B.bgl,{interactive:false,style:{color:col.muted,weight:1.2,opacity:.55,fillColor:col.land,fillOpacity:1}}).addTo(map);
      (B.borders||[]).forEach(function(g){L.geoJSON(g,{interactive:false,style:{color:col.muted,weight:1,opacity:.5,dashArray:'4 4'}}).addTo(map);});
      (B.roads||[]).forEach(function(g){L.geoJSON(g,{interactive:false,style:{color:col.road,weight:1.4,opacity:.9}}).addTo(map);});
      (B.rail||[]).forEach(function(g){L.geoJSON(g,{interactive:false,style:{color:col.muted,weight:1,opacity:.6,dashArray:'1 3'}}).addTo(map);});
      (B.lakes||[]).forEach(function(g){L.geoJSON(g,{interactive:false,style:{color:col.lake,weight:1,fillColor:col.lake,fillOpacity:1}}).addTo(map);});
      map.createPane('labels');map.getPane('labels').style.zIndex=650;map.getPane('labels').style.pointerEvents='none';
      var tl=L.layerGroup();
      (window.WR_TOWNS||[]).forEach(function(x){L.marker([x[1],x[2]],{pane:'labels',icon:L.divIcon({className:'wr-town',html:'<span>'+WR.esc(x[0])+'</span>',iconSize:[0,0]}),interactive:false,keyboard:false}).addTo(tl);});
      function lbl(){if(map.getZoom()>=10.5){if(!map.hasLayer(tl))tl.addTo(map);}else if(map.hasLayer(tl))map.removeLayer(tl);}
      map.on('zoomend',lbl);map.whenReady(lbl);
    }
    el.addEventListener('click',function(){map.scrollWheelZoom.enable();},{once:true});
    return map;
  };
  /* point: [lat,lon,name,place,stars/toques,visitors,url,exact,kind(w|e|s)] */
  WR.marker=function(p,focus){
    var col=WR.col(),kind=p[8]||'w',m,html;
    var ext=/^https?:/.test(p[6]||'');
    if(kind==='w'){
      var vis=p[5]===1,exact=p[7]===1,color=vis?col.vine:col.accent;
      m=L.circleMarker([p[0],p[1]],{radius:focus?9:(p[4]>=3?7:5.5),color:color,weight:focus?3:(exact?1.5:2.5),fillColor:color,fillOpacity:(focus||exact)?.92:0,opacity:1});
      html='<b>'+WR.esc(p[2])+'</b>'+(p[4]?' <span style="color:'+col.gold+'">'+'★'.repeat(p[4])+'</span>':'')+'<br>'+WR.esc(p[3]);
    }else{
      var cc=kind==='e'?col.gold:col.stay;
      m=L.marker([p[0],p[1]],{icon:L.divIcon({className:'wr-sq '+(kind==='e'?'eat':'stay')+(p[4]?' award':''),iconSize:[10,10]})});
      html='<b>'+WR.esc(p[2])+'</b><br>'+WR.esc(p[3]||'');
    }
    if(p[6]&&!focus)html+='<br><a href="'+WR.esc(p[6])+'"'+(ext?' target="_blank" rel="noopener"':'')+'>'+(ext?'↗ '+WR.esc(p[6].replace(/^https?:\/\/(www\.)?/,'').split('/')[0]):'→')+'</a>';
    m.bindPopup(html);m._wr=p;return m;
  };
  WR.points=function(data){
    var el=document.getElementById('map');if(!el||!window.L)return;
    var map=WR.map(el),layer=L.layerGroup().addTo(map),ms=[];
    (data.pts||[]).forEach(function(p,i){var m=WR.marker(p,data.focus===i);ms.push(m);if(!data.filters||p[8]==='w')layer.addLayer(m);});
    function fit(){
      var pts=ms.filter(function(m){return layer.hasLayer(m);}).map(function(m){return m.getLatLng();});
      if(data.focus===0&&pts.length){map.setView(pts[0],12.5);return;}
      if(pts.length===1){map.setView(pts[0],13);return;}
      if(pts.length)map.fitBounds(L.latLngBounds(pts).pad(0.06),{maxZoom:14});else map.setView([47.6,16.6],9);
    }
    fit();
    if(data.filters){
      var fv=document.getElementById('f-vis'),fs=document.getElementById('f-star'),fe=document.getElementById('f-eat'),fst=document.getElementById('f-stay');
      var apply=function(){ms.forEach(function(m){var p=m._wr,k=p[8],ok;
        if(k==='w')ok=(!fv.checked||p[5]===1)&&(!fs.checked||p[4]>0);else if(k==='e')ok=fe.checked;else ok=fst.checked;
        if(ok)layer.addLayer(m);else layer.removeLayer(m);});};
      [fv,fs,fe,fst].forEach(function(x){x.addEventListener('change',apply);});
    }
  };
})();
