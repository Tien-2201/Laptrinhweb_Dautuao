function _createToastContainer() {
  let c = document.getElementById('toast-container');
  if (c) return c;
  c = document.createElement('div');
  c.id = 'toast-container';
  c.style.position = 'fixed';
  c.style.right = '12px';
  c.style.bottom = '12px';
  c.style.zIndex = 1080;
  c.style.display = 'flex';
  c.style.flexDirection = 'column';
  c.style.gap = '8px';
  document.body.appendChild(c);
  return c;
}

function showToast(message, type = 'info', timeout = 5000) {
  const container = _createToastContainer();
  const el = document.createElement('div');
  el.className = `toast-item toast-${type}`;
  el.style.minWidth = '200px';
  el.style.maxWidth = '380px';
  el.style.padding = '14px 14px';
  el.style.borderRadius = '6px';
  el.style.boxShadow = '0 6px 18px rgba(0,0,0,0.12)';
  el.style.opacity = '0';
  el.style.transform = 'translateY(8px)';
  el.style.transition = 'opacity 200ms ease, transform 200ms ease';
  el.style.display = 'flex';
  el.style.alignItems = 'center';
  el.style.gap = '12px';

  let iconClass = 'fa-circle-info';
  let bgColor = '#0d6efd';
  let textColor = '#fff';

  switch (type) {
    case 'success': 
      iconClass = 'fa-circle-check';
      bgColor = '#28a745'; 
      textColor = '#fff';
      break;
    case 'error': 
      iconClass = 'fa-circle-xmark';
      bgColor = '#dc3545'; 
      textColor = '#fff';
      break;
    case 'warn': 
      iconClass = 'fa-triangle-exclamation';
      bgColor = '#ffc107'; 
      textColor = '#000';
      break;
    default: 
      bgColor = '#0d6efd'; 
      textColor = '#fff';
      break;
  }

  el.style.background = bgColor;
  el.style.color = textColor;

  // Create icon element
  const icon = document.createElement('i');
  icon.className = `fas ${iconClass}`;
  icon.style.fontSize = '18px';
  icon.style.flexShrink = '0';
  icon.style.width = '20px';
  icon.style.textAlign = 'center';
  
  // Create message element
  const messageEl = document.createElement('span');
  messageEl.textContent = message;
  
  el.appendChild(icon);
  el.appendChild(messageEl);
  container.appendChild(el);

  // animate in
  requestAnimationFrame(() => {
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
  });

  const to = setTimeout(() => {
    // animate out
    el.style.opacity = '0';
    el.style.transform = 'translateY(8px)';
    setTimeout(() => el.remove(), 220);
  }, timeout);

  el.addEventListener('click', () => {
    clearTimeout(to);
    el.remove();
  });

  return el;
}

window.showToast = showToast;
