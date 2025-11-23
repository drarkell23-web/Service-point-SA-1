// ---------------------------
// Category + service data
// ---------------------------
const categoriesData = [
  {
    name: "General Construction",
    tag: "All-round",
    services: [
      "Home renovations",
      "Room additions",
      "Granny flat build",
      "Garage conversion",
      "Office fit-out",
      "Structural repairs",
      "Drywall & partitioning",
      "Project management",
      "Site inspection",
      "Snag list repairs"
    ]
  },
  {
    name: "Electrical",
    tag: "Certified",
    services: [
      "Power tripping faults",
      "New plug & light points",
      "DB board upgrade",
      "Compliance CoC",
      "Generator hookup",
      "Inverter & backup power",
      "Surge protection",
      "Lighting design & install",
      "Smart home wiring",
      "Industrial electrical"
    ]
  },
  {
    name: "Plumbing",
    tag: "Emergency",
    services: [
      "Burst pipe repair",
      "Geyser repair / replace",
      "Drain unblocking",
      "Bathroom renovation plumbing",
      "Kitchen plumbing",
      "Leak detection",
      "Water pressure issues",
      "Septic tank solutions",
      "Grey water systems",
      "Solar geyser install"
    ]
  },
  {
    name: "Painting",
    tag: "Finishing",
    services: [
      "Interior repaint",
      "Exterior repaint",
      "Roof painting",
      "Damp & waterproofing",
      "Feature wall design",
      "Spray painting doors",
      "Office repaint",
      "Complex repaint",
      "Boundary wall paint",
      "Floor epoxy coating"
    ]
  },
  {
    name: "Roofing",
    tag: "Critical",
    services: [
      "Roof leak repair",
      "Tile roof replacement",
      "IBR & corrugated roof",
      "Waterproofing & flashing",
      "Ceiling replacement",
      "Gutter install & clean",
      "Skylight install",
      "Roof inspection report",
      "Timber truss repair",
      "Roof insulation"
    ]
  },
  {
    name: "Landscaping & Outdoor",
    tag: "Outdoor",
    services: [
      "Garden design",
      "Instant lawn install",
      "Irrigation systems",
      "Paving & pathways",
      "Boundary walls & fencing",
      "Decking & pergolas",
      "Pool construction",
      "Outdoor lighting",
      "Borehole & pumps",
      "Tree felling & pruning"
    ]
  },
  {
    name: "Security & Automation",
    tag: "Security",
    services: [
      "Alarm system install",
      "CCTV & remote viewing",
      "Electric fencing",
      "Gate & garage motors",
      "Access control",
      "Intercoms & video intercoms",
      "Security lighting",
      "Smart locks",
      "Security assessment",
      "Off-site monitoring setup"
    ]
  },
  {
    name: "Cleaning & Maintenance",
    tag: "Care",
    services: [
      "Post-renovation deep clean",
      "Move-in / move-out clean",
      "Office cleaning contracts",
      "Carpet & upholstery clean",
      "High-pressure cleaning",
      "Window cleaning (multi-storey)",
      "Gutter & roof clean",
      "Aircon service & clean",
      "Pest control",
      "Estate common areas clean"
    ]
  }
];

// Example contractor cards
const contractors = [
  {
    name: "KZN Build & Renew",
    badge: "Top Rated Durban",
    trades: "Renovations • Roofing • Waterproofing",
    region: "Durban North, Umhlanga, Ballito",
    rating: "4.9★",
    jobs: "320+ jobs completed"
  },
  {
    name: "Joburg Power Pros",
    badge: "Electrical Expert",
    trades: "Electrical • Backup power • CoCs",
    region: "Sandton, Fourways, Randburg",
    rating: "4.8★",
    jobs: "280+ jobs completed"
  },
  {
    name: "Cape Craft Plumbing",
    badge: "Rapid Response",
    trades: "Plumbing • Geysers • Leak Detection",
    region: "Cape Town CBD, Southern Suburbs",
    rating: "4.9★",
    jobs: "410+ jobs completed"
  },
  {
    name: "Urban Spaces Projects",
    badge: "Design & Build",
    trades: "Renovations • Painting • Office fit-outs",
    region: "National remote team",
    rating: "4.7★",
    jobs: "190+ projects delivered"
  }
];

// ---------------------------
// Helpers to talk to Telegram / your bot
// ---------------------------

function triggerExistingLeadFlow(payload) {
  // Try a few possible global functions without breaking anything.
  const candidates = [
    "servicePointSendLead",
    "sendLeadToTelegram",
    "startLeadFlow"
  ];

  let used = false;

  candidates.forEach((fnName) => {
    if (typeof window[fnName] === "function") {
      try {
        window[fnName](payload);
        used = true;
      } catch (e) {
        console.warn("Error calling", fnName, e);
      }
    }
  });

  // If you used a hidden button to open the bot, support that too.
  const triggerButton = document.getElementById("lead-bot-trigger");
  if (!used && triggerButton) {
    triggerButton.dataset.category = payload.category;
    triggerButton.dataset.service = payload.service;
    triggerButton.click();
    used = true;
  }

  if (!used) {
    // Fallback so you can see something is happening during testing.
    alert(
      `Service selected:\n${payload.service}\n\nCategory: ${payload.category}`
    );
  }
}

function handleServiceClick(categoryName, serviceName, source = "category") {
  const payload = {
    category: categoryName,
    service: serviceName,
    source
  };

  triggerExistingLeadFlow(payload);
}

// ---------------------------
// Render UI
// ---------------------------

function renderCategories() {
  const panel = document.getElementById("categories-panel");
  if (!panel) return;

  categoriesData.forEach((cat, index) => {
    const block = document.createElement("div");
    block.className = "category-block";

    const header = document.createElement("button");
    header.type = "button";
    header.className = "category-header";
    header.setAttribute("aria-expanded", index === 0 ? "true" : "false");

    const headerMain = document.createElement("div");
    headerMain.className = "category-header-main";

    const nameSpan = document.createElement("span");
    nameSpan.className = "category-name";
    nameSpan.textContent = cat.name;

    const countSpan = document.createElement("span");
    countSpan.className = "category-count";
    countSpan.textContent = `${cat.services.length}`;

    headerMain.appendChild(nameSpan);
    headerMain.appendChild(countSpan);

    const pill = document.createElement("span");
    pill.className = "category-pill";
    pill.textContent = cat.tag;

    const chevron = document.createElement("span");
    chevron.className = "category-chevron";
    chevron.textContent = "▶";

    header.appendChild(headerMain);
    header.appendChild(pill);
    header.appendChild(chevron);

    const list = document.createElement("ul");
    list.className = "service-list";

    cat.services.forEach((service) => {
      const li = document.createElement("li");
      li.className = "service-item";

      const label = document.createElement("span");
      label.className = "service-item-label";
      label.textContent = service;

      const tag = document.createElement("span");
      tag.className = "service-item-tag";
      tag.textContent = "Lead";

      li.appendChild(label);
      li.appendChild(tag);

      li.addEventListener("click", () =>
        handleServiceClick(cat.name, service, "service-click")
      );

      list.appendChild(li);
    });

    header.addEventListener("click", () => {
      const isOpen = block.classList.contains("open");
      block.classList.toggle("open", !isOpen);
      header.setAttribute("aria-expanded", String(!isOpen));
    });

    // Open first category by default
    if (index === 0) {
      block.classList.add("open");
    }

    block.appendChild(header);
    block.appendChild(list);
    panel.appendChild(block);
  });
}

function renderContractors() {
  const grid = document.getElementById("contractors-grid");
  if (!grid) return;

  contractors.forEach((c) => {
    const card = document.createElement("article");
    card.className = "contractor-card";

    const header = document.createElement("div");
    header.className = "contractor-header";

    const name = document.createElement("div");
    name.className = "contractor-name";
    name.textContent = c.name;

    const badge = document.createElement("div");
    badge.className = "contractor-badge";
    badge.textContent = c.badge;

    header.appendChild(name);
    header.appendChild(badge);

    const trades = document.createElement("p");
    trades.className = "contractor-trades";
    trades.textContent = c.trades;

    const meta = document.createElement("div");
    meta.className = "contractor-meta";

    const region = document.createElement("span");
    region.textContent = c.region;

    const jobs = document.createElement("span");
    jobs.textContent = c.jobs;

    meta.appendChild(region);
    meta.appendChild(jobs);

    const actions = document.createElement("div");
    actions.className = "contractor-actions";

    const rating = document.createElement("span");
    rating.className = "contractor-rating";
    rating.textContent = c.rating;

    const btn = document.createElement("button");
    btn.className = "contractor-btn";
    btn.type = "button";
    btn.textContent = "Request this contractor";

    btn.addEventListener("click", () => {
      handleServiceClick("Featured contractor", c.name, "contractor-card");
    });

    actions.appendChild(rating);
    actions.appendChild(btn);

    card.appendChild(header);
    card.appendChild(trades);
    card.appendChild(meta);
    card.appendChild(actions);

    grid.appendChild(card);
  });
}

// ---------------------------
// CTA buttons
// ---------------------------
function wireCTAs() {
  const matched = document.getElementById("cta-get-matched");
  if (matched) {
    matched.addEventListener("click", () => {
      handleServiceClick("Quick match", "Smart questionnaire", "hero-cta");
    });
  }

  const how = document.getElementById("cta-how-it-works");
  if (how) {
    how.addEventListener("click", () => {
      const target = document.getElementById("how-it-works");
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }

  const floating = document.getElementById("floating-bot-btn");
  if (floating) {
    floating.addEventListener("click", () => {
      handleServiceClick("Floating helper", "General enquiry", "floating-btn");
    });
  }
}

// ---------------------------
// Init
// ---------------------------
document.addEventListener("DOMContentLoaded", () => {
  renderCategories();
  renderContractors();
  wireCTAs();
});
