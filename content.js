// Check if the current page is restricted
if (window.location.href.startsWith('chrome://') || window.location.href.startsWith('edge://')) {
  alert('Extension cannot run on chrome:// or edge:// pages.');
} else {
  let hoveredElement = null;
  let isExtensionActive = true; // Track if the extension is active

  function scrapeToMarkdown(element) {
    // Helper function to check if an element should be ignored
    function shouldIgnoreElement(node) {
      const ignoredTags = ['script', 'style', 'svg'];
      const ignoredClasses = ['ad', 'ads', 'advertisement']; // Add more as needed
      const ignoredAttributes = ['onclick', 'onload']; // Add more as needed

      // Ignore specific tags
      if (ignoredTags.includes(node.tagName.toLowerCase())) {
        return true;
      }

      // Ignore elements with specific classes
      if (node.classList && Array.from(node.classList).some(cls => ignoredClasses.includes(cls))) {
        return true;
      }

      // Ignore elements with specific attributes
      if (ignoredAttributes.some(attr => node.hasAttribute(attr))) {
        return true;
      }

      return false;
    }

    // Helper function to convert HTML elements to Markdown
    function convertToMarkdown(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent.trim();
      }

      if (node.nodeType !== Node.ELEMENT_NODE || shouldIgnoreElement(node)) {
        return '';
      }

      const tagName = node.tagName.toLowerCase();
      const children = Array.from(node.childNodes).map(convertToMarkdown).join('');

      switch (tagName) {
        case 'h1':
          return `# ${children}\n\n`;
        case 'h2':
          return `## ${children}\n\n`;
        case 'h3':
          return `### ${children}\n\n`;
        case 'h4':
          return `#### ${children}\n\n`;
        case 'h5':
          return `##### ${children}\n\n`;
        case 'h6':
          return `###### ${children}\n\n`;
        case 'p':
          return `${children}\n\n`;
        case 'b':
        case 'strong':
          return `**${children}**`;
        case 'i':
        case 'em':
          return `*${children}*`;
        case 'a':
          return `[${children}](${node.href})`;
        case 'img':
          return `![${node.alt || 'image'}](${node.src})`;
        case 'ul':
          return `${children}`;
        case 'ol':
          return `${children}`;
        case 'li':
          const prefix = node.parentElement.tagName.toLowerCase() === 'ol' ? '1. ' : '- ';
          return `${prefix}${children}\n`;
        case 'blockquote':
          return `> ${children}\n\n`;
        case 'code':
          return `\`${children}\``;
        case 'pre':
          return `\`\`\`\n${children}\n\`\`\`\n\n`;
        case 'hr':
          return `---\n\n`;
        default:
          return children;
      }
    }

    // Convert the entire element to Markdown
    return convertToMarkdown(element).trim();
  }
  // Helper function to sanitize filenames
  function sanitizeFilename(title) {
    // Replace invalid characters with underscores
    return title
      .replace(/[/\\:*?"<>|]/g, '_') // Replace invalid characters
      .trim() // Remove leading/trailing spaces
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .substring(0, 100); // Limit filename length
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
    const sanitizedTitle = sanitizeFilename(tabTitle); // Sanitize the title
    const filename = `${sanitizedTitle}.md`; // Add .md extension

    // Send the URL and filename to the background script
      // chrome.runtime.sendMessage({
      //   action: 'downloadMarkdown',
      //   url: url,
      //   filename: filename
      // });

      navigator.clipboard.writeText(markdown).then(() => {
        alert('Content copied to clipboard');
      }).catch((err) => {
        console.error('Failed to copy content: ', err);
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