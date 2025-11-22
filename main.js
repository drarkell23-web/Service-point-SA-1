// Simple data-driven sidebar.
// About 200+ services grouped into categories.
const CATEGORY_DATA = [
  {
    name: "General Construction",
    services: [
      "Home renovations",
      "Room additions",
      "Granny flat builds",
      "Boundary walls",
      "Concrete works",
      "Carports",
      "Garages",
      "Drywall partitioning",
      "Ceiling installation",
      "Ceiling repairs",
      "Skirting & cornices",
      "Plastering",
      "Waterproofing of roofs",
      "Waterproofing of basements",
      "Roof truss repairs",
      "Roof sheeting replacement",
      "Structural inspections",
      "Snag list repairs",
      "Project management"
    ]
  },
  {
    name: "Electrical",
    services: [
      "New plug points",
      "Light fittings & chandeliers",
      "DB board upgrades",
      "Earth leakage testing",
      "Certificate of Compliance (CoC)",
      "Prepaid meter installation",
      "Geyser electrical repairs",
      "Stove & oven connections",
      "Generator changeover switches",
      "UPS & backup power systems",
      "Solar PV design",
      "Solar PV installation",
      "Battery storage systems",
      "Smart home automation",
      "Gate motor wiring",
      "Intercoms & access control",
      "Surge protection",
      "Lightning protection",
      "Energy-efficiency audits"
    ]
  },
  {
    name: "Plumbing",
    services: [
      "Leak detection",
      "Burst pipe repairs",
      "Geyser installation",
      "Geyser replacement",
      "Solar geyser installation",
      "High-pressure geysers",
      "Bathroom renovations",
      "Kitchen plumbing",
      "Shower installation",
      "Toilet repairs",
      "Blocked drains",
      "High-pressure drain jetting",
      "Septic tank installations",
      "Grey water systems",
      "Rainwater harvesting tanks",
      "Pump installations",
      "Water filtration systems",
      "Emergency 24/7 plumbing"
    ]
  },
  {
    name: "HVAC & Cooling",
    services: [
      "Aircon installation",
      "Aircon repairs",
      "Aircon regassing",
      "Ducted aircon systems",
      "VRV/VRF systems",
      "Extractor fans",
      "Ventilation systems",
      "Evaporative coolers",
      "Cold room installation",
      "Cold room maintenance",
      "Data-centre cooling",
      "Heat pump installation",
      "Heat pump repairs"
    ]
  },
  {
    name: "Roofing",
    services: [
      "Roof inspections",
      "Tile roof repairs",
      "Metal roof repairs",
      "Flat roof waterproofing",
      "Torch-on systems",
      "Box gutter replacement",
      "Fascia & barge boards",
      "Roof painting",
      "Roof cleaning",
      "Skylight installation",
      "Skylight leak repairs"
    ]
  },
  {
    name: "Painting & Decorating",
    services: [
      "Interior painting",
      "Exterior painting",
      "Roof painting",
      "Timber sealing",
      "Damp proofing",
      "High-rise painting",
      "Feature walls",
      "Spray painting doors",
      "Spray painting cupboards",
      "Epoxy floor coatings",
      "Line marking for warehouses"
    ]
  },
  {
    name: "Flooring",
    services: [
      "Tile installation",
      "Tile removal",
      "Vinyl flooring",
      "Laminate flooring",
      "Engineered wood floors",
      "Solid wooden floors",
      "Screeding & levelling",
      "Carpet installation",
      "Carpet tiles",
      "Garage epoxy floors",
      "Polished concrete"
    ]
  },
  {
    name: "Kitchens & Carpentry",
    services: [
      "New kitchen design",
      "Kitchen cupboards",
      "Countertops – granite",
      "Countertops – quartz / stone",
      "Countertops – solid wood",
      "Built-in cupboards (BICs)",
      "Walk-in closets",
      "TV units & feature walls",
      "Shopfitting & displays",
      "Doors & frames",
      "Skirting & architraves",
      "Decking – timber",
      "Decking – composite",
      "Pergolas & patio roofs",
      "Custom furniture pieces"
    ]
  },
  {
    name: "Windows, Doors & Glass",
    services: [
      "Aluminium window installation",
      "Aluminium door installation",
      "Sliding & stacking doors",
      "Shower glass",
      "Mirrors & feature glass",
      "Shopfront glazing",
      "Glass replacement",
      "Burglar bars",
      "Security gates",
      "Garage doors",
      "Garage door motors"
    ]
  },
  {
    name: "Landscaping & Outdoors",
    services: [
      "Garden design",
      "Irrigation systems",
      "Instant lawn supply",
      "Artificial grass",
      "Tree felling",
      "Tree pruning",
      "Stump removal",
      "Paving & edging",
      "Retaining walls",
      "Pool construction",
      "Pool relining & marbelite",
      "Pool leak detection",
      "Outdoor lighting",
      "Boma & firepit builds"
    ]
  },
  {
    name: "Security & Smart Home",
    services: [
      "Alarm systems",
      "CCTV installation",
      "Remote monitoring",
      "Electric fencing",
      "Gate motors",
      "Garage door automation",
      "Access control",
      "Biometric readers",
      "Smart locks",
      "Wi-Fi optimisation",
      "Mesh networks",
      "Smart lighting scenes",
      "Security assessments"
    ]
  },
  {
    name: "Cleaning & Hygiene",
    services: [
      "Post-construction cleaning",
      "Deep cleaning",
      "Move-in / move-out cleaning",
      "Office contract cleaning",
      "Carpet & upholstery cleaning",
      "High-pressure cleaning",
      "Window cleaning (high-level)",
      "Industrial degreasing",
      "Hoarder clean-outs",
      "Sanitising & fogging"
    ]
  }
];

// Build sidebar
function renderCategories() {
  const container = document.getElementById("category-list");
  if (!container) return;

  CATEGORY_DATA.forEach((cat, index) => {
    const categoryEl = document.createElement("div");
    categoryEl.className = "category";

    const header = document.createElement("button");
    header.type = "button";
    header.className = "category-header";
    header.setAttribute("aria-expanded", "false");

    const titleWrap = document.createElement("div");
    titleWrap.className = "category-title-wrap";

    const dot = document.createElement("span");
    dot.className = "category-dot";

    const title = document.createElement("span");
    title.className = "category-title";
    title.textContent = cat.name;

    titleWrap.appendChild(dot);
    titleWrap.appendChild(title);

    const rightWrap = document.createElement("div");
    rightWrap.style.display = "flex";
    rightWrap.style.alignItems = "center";
    rightWrap.style.gap = "6px";

    const count = document.createElement("span");
    count.className = "category-count";
    count.textContent = cat.services.length;

    const chev = document.createElement("span");
    chev.className = "category-chevron";
    chev.textContent = "›";

    rightWrap.appendChild(count);
    rightWrap.appendChild(chev);

    header.appendChild(titleWrap);
    header.appendChild(rightWrap);

    const servicesWrap = document.createElement("div");
    servicesWrap.className = "category-services";

    const ul = document.createElement("ul");
    ul.className = "service-list";

    cat.services.forEach((svc) => {
      const li = document.createElement("li");
      li.className = "service-item";
      li.textContent = svc;
      ul.appendChild(li);
    });

    servicesWrap.appendChild(ul);

    categoryEl.appendChild(header);
    categoryEl.appendChild(servicesWrap);
    container.appendChild(categoryEl);

    // Toggle handler
    header.addEventListener("click", () => {
      const isOpen = categoryEl.classList.contains("open");
      categoryEl.classList.toggle("open", !isOpen);
      header.setAttribute("aria-expanded", String(!isOpen));

      // Animate height
      if (!isOpen) {
        const scrollHeight = servicesWrap.scrollHeight;
        servicesWrap.style.maxHeight = scrollHeight + "px";
      } else {
        servicesWrap.style.maxHeight = "0px";
      }
    });

    // Optionally open the first category by default
    if (index === 0) {
      categoryEl.classList.add("open");
      header.setAttribute("aria-expanded", "true");
      servicesWrap.style.maxHeight = servicesWrap.scrollHeight + "px";
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderCategories();

  // Example subtle number animation for stats
  function animateNumber(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    let current = 0;
    const duration = 900;
    const start = performance.now();

    function step(now) {
      const progress = Math.min((now - start) / duration, 1);
      current = Math.floor(progress * target);
      el.textContent = current;
      if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }

  animateNumber("lead-count", 168);
  animateNumber("contractor-count", 210);
});
