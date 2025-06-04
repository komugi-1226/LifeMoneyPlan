(function(){
  const indicator = document.getElementById('performanceIndicator');
  if(!indicator) return;
  const textEl = indicator.querySelector('.performance-text');

  let fcp = null;
  let lcp = null;

  function format(ms){
    return (ms/1000).toFixed(1);
  }

  function update(){
    if(fcp !== null && lcp !== null){
      if(textEl){
        textEl.textContent = `FCP: ${format(fcp)} s | LCP: ${format(lcp)} s`;
      } else {
        indicator.textContent = `FCP: ${format(fcp)} s | LCP: ${format(lcp)} s`;
      }
      indicator.style.display = 'block';
    }
  }

  const poFCP = new PerformanceObserver((list)=>{
    const entry = list.getEntries().pop();
    if(entry) {
      fcp = entry.startTime;
    }
  });
  try { poFCP.observe({type:'paint', buffered:true}); } catch(e) {}

  const poLCP = new PerformanceObserver((list)=>{
    const entry = list.getEntries().pop();
    if(entry){
      lcp = entry.startTime;
    }
  });
  try { poLCP.observe({type:'largest-contentful-paint', buffered:true}); } catch(e) {}

  const interval = setInterval(update, 5000);
  update();

  window.addEventListener('beforeunload', () => {
    poFCP.disconnect();
    poLCP.disconnect();
    clearInterval(interval);
  });
})();
