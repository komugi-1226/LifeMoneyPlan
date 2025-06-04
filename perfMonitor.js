// perfMonitor.js
// ページ表示速度を測る簡単なスクリプトです
// 難しいコードがわからなくても大丈夫なように、なるべくシンプルに書いてあります
(function () {
  const display = document.getElementById('uxMetrics');
  if (!display || !('PerformanceObserver' in window)) return;

  const metrics = { fcp: null, lcp: null, timeline: [] };

  function updateDisplay() {
    const fcpText = metrics.fcp !== null ? `${metrics.fcp}ms` : '--';
    const lcpText = metrics.lcp !== null ? `${metrics.lcp}ms` : '--';
    display.textContent = `FCP: ${fcpText} | LCP: ${lcpText}`;
  }

  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      metrics.timeline.push({
        type: entry.entryType,
        name: entry.name,
        start: Math.round(entry.startTime),
      });
      if (entry.name === 'first-contentful-paint') {
        metrics.fcp = Math.round(entry.startTime);
      }
      if (entry.entryType === 'largest-contentful-paint') {
        metrics.lcp = Math.round(entry.startTime);
      }
      updateDisplay();
    });
  });

  observer.observe({ type: 'paint', buffered: true });
  observer.observe({ type: 'largest-contentful-paint', buffered: true });

  setInterval(() => {
    updateDisplay();
    console.log('Performance timeline', metrics.timeline);
  }, 5000);

  updateDisplay();
})();

