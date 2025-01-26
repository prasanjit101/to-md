// Check if the current page is restricted
if (window.location.href.startsWith('chrome://') || window.location.href.startsWith('edge://')) {
  console.log('Extension cannot run on chrome:// or edge:// pages.');
} else {
  let hoveredElement = null;
  let isExtensionActive = true; // Track if the extension is active

  function scrapeToMarkdown(element) {
    // Text content
    const text = element.textContent
      .trim()
      .replace(/\n\s+/g, '\n\n');

    // Images
    const images = Array.from(element.querySelectorAll('img'))
      .map(img => `![${img.alt || 'image'}](${img.src})`);

    // Videos
    const videos = Array.from(element.querySelectorAll('video, source[type^="video/"]'))
      .map(video => {
        const src = video.src || video.querySelector('source')?.src;
        return src ? `[Video](${src})` : '';
      })
      .filter(link => link);

    return `${text}\n\n${images.join('\n')}\n\n${videos.join('\n')}`;
  }

  function handleElementClick(event) {
    if (!isExtensionActive) return; // Do nothing if the extension is inactive

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const element = event.target.closest('*');
    
    // Remove hover outline
    if (hoveredElement) {
      hoveredElement.style.outline = '';
    }

    // Visual feedback for click
    element.style.outline = '2px solid red';
    setTimeout(() => element.style.outline = '', 500);

    // Generate Markdown
    const markdown = scrapeToMarkdown(element);
    
    // Cleanup event listeners
    deactivateExtension();
    
    // Create a Blob and generate a URL
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);

    // Get the tab title
    chrome.runtime.sendMessage({ action: 'getTabTitle' }, (response) => {
      const tabTitle = response.tabTitle || 'content'; // Fallback to 'content' if title is unavailable
      const filename = `${tabTitle}.md`;

      // Send the URL and filename to the background script
      chrome.runtime.sendMessage({
        action: 'downloadMarkdown',
        url: url,
        filename: filename
      });
    });
  }

  function handleElementHover(event) {
    if (!isExtensionActive) return; // Do nothing if the extension is inactive

    const element = event.target.closest('*');
    if (element && element !== hoveredElement) {
      // Remove outline from previously hovered element
      if (hoveredElement) {
        hoveredElement.style.outline = '';
      }
      // Add outline to the currently hovered element
      element.style.outline = '2px solid red';
      hoveredElement = element;
    }
  }

  function handleElementHoverOut(event) {
    if (!isExtensionActive) return; // Do nothing if the extension is inactive

    const element = event.target.closest('*');
    if (element === hoveredElement) {
      // Remove outline when mouse leaves the element
      element.style.outline = '';
      hoveredElement = null;
    }
  }

  function deactivateExtension() {
    // Remove all event listeners
    document.removeEventListener('click', handleElementClick, true);
    document.removeEventListener('mouseover', handleElementHover);
    document.removeEventListener('mouseout', handleElementHoverOut);

    // Reset hovered element
    if (hoveredElement) {
      hoveredElement.style.outline = '';
      hoveredElement = null;
    }

    // Set extension as inactive
    isExtensionActive = false;
  }

  function activateExtension() {
    // Reattach event listeners
    document.addEventListener('click', handleElementClick, true);
    document.addEventListener('mouseover', handleElementHover);
    document.addEventListener('mouseout', handleElementHoverOut);

    // Set extension as active
    isExtensionActive = true;
  }

  // Initialize the extension
  activateExtension();
}