// DOM Elements (hamburger menu elements removed)
const searchInput = document.querySelector('.search-input');
const sortBy = document.getElementById('sort-by');
const pluginList = document.getElementById('plugin-list');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const pageNumbers = document.getElementById('page-numbers');

// GitHub configuration
const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/csgdV2/PlugStore-Website/main/plugins.json';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

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
  const now = Date.now();
  const cachedData = localStorage.getItem('githubPluginsData');
  
  // Use cached data if not expired
  if (cachedData) {
    const { data, timestamp } = JSON.parse(cachedData);
    if (now - timestamp < CACHE_DURATION) {
      allPlugins = data;
      filteredPlugins = [...allPlugins];
      renderPlugins();
      return;
    }
  }

  try {
    pluginList.innerHTML = '<div class="loading">Loading plugins...</div>';
    
    const response = await fetch(`${GITHUB_RAW_URL}?t=${now}`);
    if (!response.ok) throw new Error('Failed to fetch');
    
    allPlugins = await response.json();
    filteredPlugins = [...allPlugins];
    
    // Update cache
    localStorage.setItem('githubPluginsData', JSON.stringify({
      data: allPlugins,
      timestamp: now
    }));
    
    renderPlugins();
  } catch (error) {
    console.error('Error fetching plugins:', error);
    pluginList.innerHTML = '<div class="error">Failed to load plugins. Please try again later.</div>';
    
    // Fallback to cached data if available
    if (cachedData) {
      allPlugins = JSON.parse(cachedData).data;
      filteredPlugins = [...allPlugins];
      renderPlugins();
    }
  }
}

// Render plugins based on current filters and pagination
function renderPlugins() {
  pluginList.innerHTML = '';
  
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPlugins = filteredPlugins.slice(startIndex, endIndex);
  
  if (paginatedPlugins.length === 0) {
    pluginList.innerHTML = '<div class="no-results">No plugins found matching your search</div>';
    return;
  }

  paginatedPlugins.forEach(plugin => {
    const pluginCard = document.createElement('div');
    pluginCard.className = 'plugin-card';
    pluginCard.innerHTML = `
      <div class="plugin-header">
        <h3>${plugin.name} <span class="plugin-author">by ${plugin.author}</span></h3>
        <div class="plugin-tags">
          ${plugin.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
        </div>
      </div>
      <p class="plugin-description">${plugin.description}</p>
      <div class="plugin-stats">
        <span>${formatNumber(plugin.downloads)} downloads</span>
        ${plugin.followers ? `<span>${formatNumber(plugin.followers)} followers</span>` : ''}
        <span>Updated ${formatDate(plugin.updated)}</span>
      </div>
    `;
    pluginList.appendChild(pluginCard);
  });
  
  updatePagination();
}

// Update pagination controls
function updatePagination() {
  const totalPages = Math.ceil(filteredPlugins.length / itemsPerPage);
  pageNumbers.innerHTML = '';

  // Previous button state
  prevPageBtn.disabled = currentPage === 1;

  // Page numbers
  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  if (startPage > 1) {
    addPageNumber(1);
    if (startPage > 2) {
      pageNumbers.innerHTML += '<span class="page-dots">...</span>';
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    addPageNumber(i);
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      pageNumbers.innerHTML += '<span class="page-dots">...</span>';
    }
    addPageNumber(totalPages);
  }

  // Next button state
  nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;
}

// Helper to add a page number button
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
  const searchTerm = searchInput.value.toLowerCase();
  
  // Filter by search term
  filteredPlugins = allPlugins.filter(plugin => 
    plugin.name.toLowerCase().includes(searchTerm) || 
    plugin.description.toLowerCase().includes(searchTerm)
  );

  // Sort plugins
  const sortValue = sortBy.value;
  filteredPlugins.sort((a, b) => {
    if (sortValue === 'newest') {
      return new Date(b.updated) - new Date(a.updated);
    } else {
      // Relevance sorting - prioritize matches in name over description
      const aNameMatch = a.name.toLowerCase().includes(searchTerm);
      const bNameMatch = b.name.toLowerCase().includes(searchTerm);
      
      if (aNameMatch && !bNameMatch) return -1;
      if (!aNameMatch && bNameMatch) return 1;
      
      // Secondary sort by downloads if relevance is equal
      return b.downloads - a.downloads;
    }
  });

  currentPage = 1;
  renderPlugins();
}

// Format large numbers with commas
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Format date as relative time
function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = now - date;
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
}

// Debounce function for search input
function debounce(func, delay) {
  let timeoutId;
  return function() {
    const context = this;
    const args = arguments;
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(context, args), delay);
  };
}

// Set up event listeners (hamburger menu listeners removed)
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

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
