document.addEventListener('DOMContentLoaded', () => {
  // --- Check Auth State ---
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      const ctaBlock = document.getElementById('header-cta-block');
      if (ctaBlock) {
        ctaBlock.innerHTML = `
          <div style="display: flex; align-items: center; gap: 15px; color: var(--text-white);">
            <div style="display: flex; flex-direction: column; text-align: right; display: none; @media(min-width: 768px){display:flex}">
              <span style="font-weight: 600; font-size: 0.9rem;">${user.fname} ${user.lname}</span>
              <span style="font-size: 0.75rem; color: var(--accent-emerald);">Verified Account</span>
            </div>
            <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--accent-emerald); color: var(--navy); display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.2rem;">
              ${user.fname.charAt(0).toUpperCase()}
            </div>
            <button id="btn-logout" class="btn btn-secondary" style="padding: 0.4rem 1rem; font-size: 0.8rem; margin-left: 5px;">Logout</button>
          </div>
        `;
        document.getElementById('btn-logout').addEventListener('click', () => {
          localStorage.removeItem('user');
          window.location.reload();
        });
      }
    } catch (e) {
      console.error('Failed to parse user data');
    }
  }

  // --- Navigation & Scroll Features ---
  const header = document.querySelector('.header');
  const hamburger = document.querySelector('.hamburger');
  const navMenu = document.querySelector('.nav-menu');
  const navLinks = document.querySelectorAll('.nav-link');

  // Change header background on scroll
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });

  // Mobile menu toggle
  if (hamburger) {
    hamburger.addEventListener('click', () => {
      navMenu.classList.toggle('open');
      const icon = hamburger.querySelector('svg');
      if (navMenu.classList.contains('open')) {
        icon.innerHTML = '<path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
      } else {
        icon.innerHTML = '<path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
      }
    });
  }

  // Active link highlighter on scroll
  const sections = document.querySelectorAll('section[id]');
  window.addEventListener('scroll', () => {
    let scrollY = window.pageYOffset;
    sections.forEach(current => {
      const sectionHeight = current.offsetHeight;
      const sectionTop = current.offsetTop - 100;
      const sectionId = current.getAttribute('id');

      if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
        document.querySelector(`.nav-menu a[href*=${sectionId}]`)?.classList.add('active');
      } else {
        document.querySelector(`.nav-menu a[href*=${sectionId}]`)?.classList.remove('active');
      }
    });
  });

  // Close mobile menu when clicking nav links
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      navMenu.classList.remove('open');
      const icon = hamburger.querySelector('svg');
      if (icon) {
        icon.innerHTML = '<path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
      }
    });
  });


  // --- 3. Age/Goal Selector (Flashcard Detail-Reveal Subpages) ---
  const ageCards = document.querySelectorAll('.age-card');
  const goalsViewport = document.getElementById('goals-viewport');
  const goalDetailView = document.getElementById('goal-detail-view');
  const btnBackToGoals = document.getElementById('btn-back-to-goals');
  const goalPanels = document.querySelectorAll('.goal-panel');

  ageCards.forEach(card => {
    card.addEventListener('click', () => {
      const targetPanelId = card.dataset.tab;

      // Hide all panels
      goalPanels.forEach(panel => {
        panel.classList.remove('active');
      });

      // Show targeted panel
      const targetPanel = document.getElementById(targetPanelId);
      if (targetPanel) {
        targetPanel.classList.add('active');
      }

      // Slide in subpage viewport
      goalsViewport.classList.add('detail-active');

      // Scroll to goal-selector section smoothly to align viewport
      const section = document.getElementById('goal-selector');
      const headerOffset = 90;
      const elementPosition = section.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    });
  });

  // Back button event
  if (btnBackToGoals) {
    btnBackToGoals.addEventListener('click', () => {
      // Slide back to grid view
      goalsViewport.classList.remove('detail-active');
    });
  }


  // --- 5. SIP / Goal Calculator (SVG Donut Chart Calculation) ---
  const calcTypeBtns = document.querySelectorAll('.calc-toggle-btn');
  const amountSlider = document.getElementById('calc-amount');
  const durationSlider = document.getElementById('calc-duration');
  const returnSlider = document.getElementById('calc-return');

  const amountVal = document.getElementById('amount-val');
  const durationVal = document.getElementById('duration-val');
  const returnVal = document.getElementById('return-val');

  // Outputs
  const outInvested = document.getElementById('out-invested');
  const outEstReturns = document.getElementById('out-est-returns');
  const outTotal = document.getElementById('out-total');

  // Chart segment element handlers
  const chartInvested = document.getElementById('chart-invested');
  const chartReturns = document.getElementById('chart-returns');
  const donutTotalValue = document.getElementById('donut-total-value');
  const legendInvestedVal = document.getElementById('legend-invested-val');
  const legendReturnsVal = document.getElementById('legend-returns-val');

  let calculationMode = 'sip'; // 'sip' or 'lumpsum'

  // Indian Rupee currency formatter
  const rupeeFormatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  });

  function updateSliderBackground(slider) {
    const min = parseFloat(slider.min);
    const max = parseFloat(slider.max);
    const val = parseFloat(slider.value);
    const percentage = ((val - min) / (max - min)) * 100;
    slider.style.background = `linear-gradient(to right, var(--accent-emerald) 0%, var(--accent-emerald) ${percentage}%, var(--navy) ${percentage}%, var(--navy) 100%)`;
  }

  function calculateResults() {
    const P = parseFloat(amountSlider.value);
    const t = parseFloat(durationSlider.value);
    const expectedReturn = parseFloat(returnSlider.value);

    let invested = 0;
    let total = 0;

    if (calculationMode === 'sip') {
      const i = expectedReturn / 12 / 100; // monthly rate
      const n = t * 12; // monthly periods

      invested = P * n;
      total = P * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
    } else {
      invested = P;
      const r = expectedReturn / 100;
      total = P * Math.pow(1 + r, t);
    }

    const estReturns = Math.max(0, total - invested);

    // Dynamic Donut Chart Update Math
    // Circumference of SVG circle (Radius R = 15.91549) is exactly 100
    const totalPercentage = 100;
    const investedPercent = (invested / total) * 100;
    const returnsPercent = (estReturns / total) * 100;

    // Segment 1: Invested
    if (chartInvested) {
      chartInvested.setAttribute('stroke-dasharray', `${investedPercent} ${totalPercentage - investedPercent}`);
      chartInvested.setAttribute('stroke-dashoffset', '25'); // start at 12 o'clock (90 degrees offset)
    }

    // Segment 2: Returns
    if (chartReturns) {
      chartReturns.setAttribute('stroke-dasharray', `${returnsPercent} ${totalPercentage - returnsPercent}`);
      chartReturns.setAttribute('stroke-dashoffset', `${25 - investedPercent}`); // stack after Segment 1
    }

    // Display values
    if (donutTotalValue) donutTotalValue.innerText = rupeeFormatter.format(total);
    if (legendInvestedVal) legendInvestedVal.innerText = rupeeFormatter.format(invested);
    if (legendReturnsVal) legendReturnsVal.innerText = rupeeFormatter.format(estReturns);

    if (outInvested) outInvested.innerText = rupeeFormatter.format(invested);
    if (outEstReturns) outEstReturns.innerText = rupeeFormatter.format(estReturns);
    if (outTotal) outTotal.innerText = rupeeFormatter.format(total);
  }

  // Bind slider input actions
  const sliders = [amountSlider, durationSlider, returnSlider];
  sliders.forEach(slider => {
    slider.addEventListener('input', () => {
      if (slider.id === 'calc-amount') {
        amountVal.innerText = rupeeFormatter.format(slider.value);
      } else if (slider.id === 'calc-duration') {
        durationVal.innerText = `${slider.value} Yr${slider.value > 1 ? 's' : ''}`;
      } else if (slider.id === 'calc-return') {
        returnVal.innerText = `${slider.value}%`;
      }

      updateSliderBackground(slider);
      calculateResults();
    });
    updateSliderBackground(slider);
  });

  // Toggle calculation type (SIP vs Lumpsum)
  calcTypeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      calcTypeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      calculationMode = btn.dataset.mode;

      const amtLabel = document.querySelector('label[for="calc-amount"]');
      if (calculationMode === 'sip') {
        amtLabel.innerText = 'Monthly Investment';
        amountSlider.min = 500;
        amountSlider.max = 100000;
        amountSlider.step = 500;
        amountSlider.value = 5000;
      } else {
        amtLabel.innerText = 'One-time Investment';
        amountSlider.min = 1000;
        amountSlider.max = 1000000;
        amountSlider.step = 1000;
        amountSlider.value = 50000;
      }

      amountVal.innerText = rupeeFormatter.format(amountSlider.value);
      updateSliderBackground(amountSlider);
      calculateResults();
    });
  });

  // Initial calculation
  amountVal.innerText = rupeeFormatter.format(amountSlider.value);
  durationVal.innerText = `${durationSlider.value} Yrs`;
  returnVal.innerText = `${returnSlider.value}%`;
  calculateResults();


  // --- 11. FAQ Section Accordion ---
  const faqQuestions = document.querySelectorAll('.faq-question');

  faqQuestions.forEach(question => {
    question.addEventListener('click', () => {
      const faqItem = question.parentElement;
      const faqAnswer = faqItem.querySelector('.faq-answer');
      const isActive = faqItem.classList.contains('active');

      document.querySelectorAll('.faq-item').forEach(item => {
        item.classList.remove('active');
        item.querySelector('.faq-answer').style.maxHeight = null;
      });

      if (!isActive) {
        faqItem.classList.add('active');
        faqAnswer.style.maxHeight = faqAnswer.scrollHeight + 'px';
      }
    });
  });





  // --- Reveal Sections on Scroll (Intersection Observer) ---
  const reveals = document.querySelectorAll('.reveal');
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });

  reveals.forEach(reveal => {
    revealObserver.observe(reveal);
  });

  // --- Continuous Scroll for Age Selector ---
  const ageCardsGrid = document.getElementById('age-cards-grid');
  if (ageCardsGrid) {
    let scrollDirection = 1; // 1 for right, -1 for left
    let autoScrollSpeed = 1; // pixels per frame
    let autoScrollEnabled = true;
    let isUserScrolling = false;
    let scrollTimeout;

    function autoScroll() {
      if (!autoScrollEnabled || isUserScrolling) return;

      const { scrollWidth, scrollLeft, clientWidth } = ageCardsGrid;
      const maxScroll = scrollWidth - clientWidth;

      let newScrollLeft = scrollLeft + (autoScrollSpeed * scrollDirection);

      // Reverse direction at the ends for continuous loop
      if (newScrollLeft >= maxScroll) {
        newScrollLeft = maxScroll;
        scrollDirection = -1;
      } else if (newScrollLeft <= 0) {
        newScrollLeft = 0;
        scrollDirection = 1;
      }

      ageCardsGrid.scrollLeft = newScrollLeft;
      requestAnimationFrame(autoScroll);
    }

    // Start auto scroll
    autoScroll();

    // Pause auto scroll on user interaction
    ageCardsGrid.addEventListener('mouseenter', () => {
      autoScrollEnabled = false;
    });

    ageCardsGrid.addEventListener('mouseleave', () => {
      autoScrollEnabled = true;
      autoScroll();
    });

    // Detect user scrolling
    ageCardsGrid.addEventListener('scroll', () => {
      isUserScrolling = true;
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        isUserScrolling = false;
      }, 1000);
    });

    // Touch support for mobile
    let touchStartX = 0;
    ageCardsGrid.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
      autoScrollEnabled = false;
    });

    ageCardsGrid.addEventListener('touchend', () => {
      autoScrollEnabled = true;
      autoScroll();
    });
  }

  // ── Fund Chips Horizontal Scroll (drag-to-scroll) ──
  const fundsViewport = document.getElementById('funds-viewport');
  if (fundsViewport) {
    let isDragging = false;
    let startX = 0;
    let scrollLeft = 0;

    fundsViewport.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.pageX - fundsViewport.offsetLeft;
      scrollLeft = fundsViewport.scrollLeft;
      fundsViewport.classList.add('is-dragging');
    });
    document.addEventListener('mouseup', () => {
      isDragging = false;
      fundsViewport.classList.remove('is-dragging');
    });
    fundsViewport.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      e.preventDefault();
      const x = e.pageX - fundsViewport.offsetLeft;
      const walk = (x - startX) * 1.4;
      fundsViewport.scrollLeft = scrollLeft - walk;
    });

    // Touch scroll
    let touchStartXF = 0;
    let touchScrollLeft = 0;
    fundsViewport.addEventListener('touchstart', (e) => {
      touchStartXF = e.touches[0].clientX;
      touchScrollLeft = fundsViewport.scrollLeft;
    }, { passive: true });
    fundsViewport.addEventListener('touchmove', (e) => {
      const dx = touchStartXF - e.touches[0].clientX;
      fundsViewport.scrollLeft = touchScrollLeft + dx;
    }, { passive: true });
  }
});
