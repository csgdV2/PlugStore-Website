// DOM Elements
const searchInput = document.querySelector('.search-input');
const sortBy = document.getElementById('sort-by');
const pluginList = document.getElementById('plugin-list');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const pageNumbers = document.getElementById('page-numbers');

// GitHub configuration
const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/csgdV2/PlugStore-Website/main/plugins.json';

// State variables
let currentPage = 1;
let itemsPerPage = 10;
let allPlugins = [];
let filteredPlugins = [];

// Initialize the application
async function init() {
  await fetchPlugins();
  setupEventListeners();
}

// Fetch plugins from GitHub
async function fetchPlugins() {
  try {
    showStatusMessage('Loading plugins...');
    
    const response = await fetch(GITHUB_RAW_URL);
    if (!response.ok) throw new Error('Failed to fetch');
    
    const data = await response.json();
    allPlugins = Array.isArray(data) ? data : data.plugins || [];
    filteredPlugins = [...allPlugins];
    
    renderPlugins();
  } catch (error) {
    console.error('Error fetching plugins:', error);
    showStatusMessage('Failed to load plugins. Please try again later.', 'error');
  }
}

// Show status messages without duplicates
function showStatusMessage(message, type = 'loading') {
  pluginList.innerHTML = `<div class="status-message ${type}">${message}</div>`;
}

// Render plugins with optimized layout
function renderPlugins() {
  pluginList.innerHTML = '';
  
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPlugins = filteredPlugins.slice(startIndex, endIndex);
  
  if (paginatedPlugins.length === 0) {
    showStatusMessage('No plugins found matching your search', 'no-results');
    return;
  }

  paginatedPlugins.forEach(plugin => {
    const pluginCard = document.createElement('div');
    pluginCard.className = 'plugin-card';
    
    // Create tags with proper spacing
    const tagsHTML = plugin.tags 
      ? plugin.tags.map(tag => `<span class="tag">${tag}</span>`).join(' ') 
      : '';
    
    // Create download button if URL exists
    const downloadButtonHTML = plugin.download_url
      ? `<a href="${plugin.download_url}" class="download-btn" target="_blank" rel="noopener noreferrer">
           Download
         </a>`
      : `<button class="download-btn disabled" disabled>
           Unavailable
         </button>`;
    
    pluginCard.innerHTML = `
      <div class="plugin-content">
        <div class="plugin-header">
          <div class="plugin-icon-container">
            <img src="${plugin.icon_url || 'assets/default-plugin-icon.png'}" 
                 alt="${plugin.name} Icon" 
                 class="plugin-icon"
                 onerror="this.src='assets/default-plugin-icon.png'">
          </div>
          <div class="plugin-title">
            <h3>${plugin.name}</h3>
            <span class="plugin-author">by ${plugin.author}</span>
          </div>
          <div class="plugin-actions">
            ${downloadButtonHTML}
          </div>
        </div>
        <div class="plugin-meta">
          <div class="plugin-tags">
            ${tagsHTML}
          </div>
          <span class="update-date">Updated ${formatDate(plugin.updated)}</span>
        </div>
        <div class="plugin-description">
          <p>${plugin.description}</p>
        </div>
      </div>
    `;
    pluginList.appendChild(pluginCard);
  });
  
  updatePagination();
}

// Initialize the application
document.addEventListener('DOMContentLoaded', init);

// Update pagination controls
function updatePagination() {
  const totalPages = Math.ceil(filteredPlugins.length / itemsPerPage);
  pageNumbers.innerHTML = '';

  // Previous button state
  prevPageBtn.disabled = currentPage === 1;

  // Create page numbers with ellipsis for large ranges
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, currentPage + 2);

  if (currentPage - 1 < 2) {
    endPage = Math.min(5, totalPages);
  }
  if (totalPages - currentPage < 2) {
    startPage = Math.max(1, totalPages - 4);
  }

  if (startPage > 1) {
    addPageNumber(1);
    if (startPage > 2) {
      pageNumbers.appendChild(createEllipsis());
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    addPageNumber(i);
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      pageNumbers.appendChild(createEllipsis());
    }
    addPageNumber(totalPages);
  }

  // Next button state
  nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;
}

function createEllipsis() {
  const ellipsis = document.createElement('span');
  ellipsis.className = 'page-ellipsis';
  ellipsis.textContent = '...';
  return ellipsis;
}

function addPageNumber(page) {
  const pageNumber = document.createElement('span');
  pageNumber.className = `page-number ${page === currentPage ? 'active' : ''}`;
  pageNumber.textContent = page;
  pageNumber.addEventListener('click', () => {
    if (page !== currentPage) {
      currentPage = page;
      renderPlugins();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
  pageNumbers.appendChild(pageNumber);
}

// Filter and sort plugins
function filterAndSortPlugins() {
  const searchTerm = searchInput.value.toLowerCase().trim();
  
  // Filter by search term
  filteredPlugins = allPlugins.filter(plugin => {
    const nameMatch = plugin.name.toLowerCase().includes(searchTerm);
    const descMatch = plugin.description.toLowerCase().includes(searchTerm);
    const tagMatch = plugin.tags?.some(tag => 
      tag.toLowerCase().includes(searchTerm)
    ) || false;
    
    return nameMatch || descMatch || tagMatch;
  });

  // Sort plugins
  const sortValue = sortBy.value;
  filteredPlugins.sort((a, b) => {
    if (sortValue === 'newest') {
      return new Date(b.updated) - new Date(a.updated);
    } else {
      // Relevance sorting
      const aNameMatch = a.name.toLowerCase().includes(searchTerm);
      const bNameMatch = b.name.toLowerCase().includes(searchTerm);
      
      if (aNameMatch && !bNameMatch) return -1;
      if (!aNameMatch && bNameMatch) return 1;
      
      // Secondary sort by update date
      return new Date(b.updated) - new Date(a.updated);
    }
  });

  currentPage = 1;
  renderPlugins();
}

// Format date as relative time
function formatDate(dateString) {
  if (!dateString) return 'unknown';
  
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks === 1) return '1 week ago';
    if (diffWeeks < 4) return `${diffWeeks} weeks ago`;
    
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths === 1) return '1 month ago';
    if (diffMonths < 12) return `${diffMonths} months ago`;
    
    const diffYears = Math.floor(diffDays / 365);
    return diffYears === 1 ? '1 year ago' : `${diffYears} years ago`;
  } catch (e) {
    console.error('Error formatting date:', e);
    return 'unknown';
  }
}

// Debounce function for search input
function debounce(func, delay) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

// Set up event listeners
function setupEventListeners() {
  // Search and filter events
  searchInput.addEventListener('input', debounce(filterAndSortPlugins, 300));
  sortBy.addEventListener('change', filterAndSortPlugins);

  // Pagination events
  prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderPlugins();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  nextPageBtn.addEventListener('click', () => {
    const totalPages = Math.ceil(filteredPlugins.length / itemsPerPage);
    if (currentPage < totalPages) {
      currentPage++;
      renderPlugins();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
}

// Initialize the application
document.addEventListener('DOMContentLoaded', init);