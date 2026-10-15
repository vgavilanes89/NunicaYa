/**
 * Self-hosted year / make / model / trim filters (replaces CarQuery API).
 * Values are stored as plain strings in Firestore/Algolia for facet filtering.
 */
(function (global) {
  'use strict';

  const CAR_MAKES = [
    'Acura', 'Audi', 'BMW', 'Chevrolet', 'Ford', 'Honda', 'Hyundai', 'Isuzu', 'Jeep', 'Kia',
    'Land Rover', 'Lexus', 'Mazda', 'Mercedes-Benz', 'Mitsubishi', 'Nissan', 'Subaru', 'Suzuki',
    'Toyota', 'Volkswagen', 'Volvo',
  ];

  const MOTORCYCLE_MAKES = [
    'Aprilia', 'BMW', 'Ducati', 'Harley-Davidson', 'Honda', 'Kawasaki', 'KTM', 'Royal Enfield',
    'Suzuki', 'Triumph', 'Yamaha',
  ];

  const MODELS_BY_MAKE = {
    Acura: ['ILX', 'Integra', 'MDX', 'RDX', 'TLX'],
    Audi: ['A3', 'A4', 'A6', 'Q3', 'Q5', 'Q7'],
    BMW: ['3 Series', '5 Series', 'X1', 'X3', 'X5'],
    Chevrolet: ['Colorado', 'Equinox', 'Silverado', 'Spark', 'Suburban', 'Tahoe', 'Trailblazer'],
    Ford: ['Bronco', 'EcoSport', 'Edge', 'Escape', 'Explorer', 'F-150', 'Focus', 'Ranger'],
    Honda: ['Accord', 'CR-V', 'Civic', 'Fit', 'HR-V', 'Odyssey', 'Pilot', 'Ridgeline'],
    Hyundai: ['Accent', 'Elantra', 'Santa Fe', 'Sonata', 'Tucson', 'Venue'],
    Isuzu: ['D-Max', 'MU-X'],
    Jeep: ['Cherokee', 'Compass', 'Grand Cherokee', 'Renegade', 'Wrangler'],
    Kia: ['Forte', 'Rio', 'Seltos', 'Sorento', 'Soul', 'Sportage'],
    'Land Rover': ['Defender', 'Discovery', 'Range Rover', 'Range Rover Sport'],
    Lexus: ['ES', 'GX', 'IS', 'NX', 'RX', 'UX'],
    Mazda: ['CX-3', 'CX-30', 'CX-5', 'CX-9', 'Mazda3', 'Mazda6'],
    'Mercedes-Benz': ['C-Class', 'E-Class', 'GLA', 'GLC', 'GLE', 'Sprinter'],
    Mitsubishi: ['L200', 'Mirage', 'Montero Sport', 'Outlander', 'Xpander'],
    Nissan: ['Frontier', 'Kicks', 'Leaf', 'Murano', 'Pathfinder', 'Sentra', 'Versa', 'X-Trail'],
    Subaru: ['Crosstrek', 'Forester', 'Impreza', 'Legacy', 'Outback'],
    Suzuki: ['Baleno', 'Ertiga', 'Grand Vitara', 'Jimny', 'Swift', 'Vitara'],
    Toyota: ['4Runner', 'Camry', 'Corolla', 'Fortuner', 'Hilux', 'Land Cruiser', 'Prado', 'RAV4', 'Yaris'],
    Volkswagen: ['Amarok', 'Golf', 'Jetta', 'T-Cross', 'Tiguan'],
    Volvo: ['XC40', 'XC60', 'XC90'],
  };

  const MOTORCYCLE_MODELS_BY_MAKE = {
    Aprilia: ['RSV4', 'Tuono', 'SR GT'],
    BMW: ['G 310 R', 'R 1250 GS', 'S 1000 RR'],
    Ducati: ['Monster', 'Multistrada', 'Panigale', 'Scrambler'],
    'Harley-Davidson': ['Iron 883', 'Sportster', 'Street Glide'],
    Honda: ['Africa Twin', 'CB500F', 'CBR500R', 'CBR600RR', 'CRF250L', 'Shadow'],
    Kawasaki: ['Ninja 400', 'Ninja 650', 'Versys', 'Vulcan', 'Z900'],
    KTM: ['390 Duke', '690 Enduro', '1290 Super Adventure'],
    'Royal Enfield': ['Classic 350', 'Himalayan', 'Interceptor 650'],
    Suzuki: ['Boulevard', 'DR-Z400', 'GSX-R600', 'V-Strom 650'],
    Triumph: ['Bonneville', 'Street Triple', 'Tiger 900'],
    Yamaha: ['MT-03', 'MT-07', 'R3', 'Tenere 700', 'YZF-R6'],
  };

  const OTHER_PLACEHOLDERS = {
    year: { en: 'e.g. 1975', es: 'ej. 1975' },
    make: { en: 'e.g. Toyota', es: 'ej. Toyota' },
    model: { en: 'e.g. Corolla', es: 'ej. Corolla' },
    trim: { en: 'e.g. LE', es: 'ej. LE' },
  };

  function uiLabels(lang) {
    const es = lang === 'es';
    return {
      allYears: es ? 'Todos los Años' : 'All Years',
      allMakes: es ? 'Todas las Marcas' : 'All Makes',
      allModels: es ? 'Todos los Modelos' : 'All Models',
      allTrims: es ? 'Todas las Versiones' : 'All Trims',
      other: es ? 'Otro' : 'Other',
    };
  }

  function isPlaceholderOption(text) {
    if (!text) return true;
    const lower = text.toLowerCase();
    if (lower.indexOf('loading') === 0 || lower === '...') return true;
    return /^[-–—]/.test(text) && (
      lower.indexOf('year') !== -1 || lower.indexOf('make') !== -1 ||
      lower.indexOf('model') !== -1 || lower.indexOf('trim') !== -1 ||
      lower.indexOf('select') !== -1 || lower.indexOf('año') !== -1 ||
      lower.indexOf('marca') !== -1 || lower.indexOf('modelo') !== -1 ||
      lower.indexOf('versión') !== -1 || lower.indexOf('todos') !== -1 ||
      lower.indexOf('todas') !== -1
    );
  }

  function addOption(select, value, text) {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = text;
    select.appendChild(opt);
  }

  function populateYears(select, minYear, maxYear, lang, includeOther) {
    if (!select) return;
    const labels = uiLabels(lang);
    select.innerHTML = '';
    addOption(select, '', labels.allYears);
    for (let y = maxYear; y >= minYear; y--) {
      addOption(select, String(y), String(y));
    }
    if (includeOther) {
      addOption(select, 'other', labels.other);
    }
    select.disabled = false;
  }

  function populateMakes(select, makes, lang, includeOther) {
    if (!select) return;
    const labels = uiLabels(lang);
    select.innerHTML = '';
    addOption(select, '', labels.allMakes);
    makes.forEach(function (make) {
      addOption(select, make, make);
    });
    if (includeOther) {
      addOption(select, 'other', labels.other);
    }
    select.disabled = false;
  }

  function populateModels(select, make, modelsMap, lang, includeOther) {
    if (!select) return;
    const labels = uiLabels(lang);
    select.innerHTML = '';
    addOption(select, '', labels.allModels);
    if (make && make !== 'other') {
      const models = modelsMap[make] || [];
      models.forEach(function (model) {
        addOption(select, model, model);
      });
    }
    if (includeOther) {
      addOption(select, 'other', labels.other);
    }
    select.disabled = false;
  }

  function populateTrims(select, lang, includeOther) {
    if (!select) return;
    const labels = uiLabels(lang);
    select.innerHTML = '';
    addOption(select, '', labels.allTrims);
    if (includeOther) {
      addOption(select, 'other', labels.other);
    }
    select.disabled = false;
  }

  function getModelsMap(mode) {
    return mode === 'motorcycle' ? MOTORCYCLE_MODELS_BY_MAKE : MODELS_BY_MAKE;
  }

  function getMakes(mode) {
    return mode === 'motorcycle' ? MOTORCYCLE_MAKES : CAR_MAKES;
  }

  function fieldKeyFromSelectId(selectId) {
    if (selectId.indexOf('year') !== -1) return 'year';
    if (selectId.indexOf('make') !== -1 && selectId.indexOf('model') === -1) return 'make';
    if (selectId.indexOf('model') !== -1 && selectId.indexOf('trim') === -1) return 'model';
    if (selectId.indexOf('trim') !== -1) return 'trim';
    return '';
  }

  function wrapSelectCell(selectEl) {
    if (!selectEl || !selectEl.parentElement) return selectEl.parentElement;
    if (selectEl.parentElement.classList.contains('vehicle-filter-cell')) {
      return selectEl.parentElement;
    }
    const wrap = document.createElement('div');
    wrap.className = 'vehicle-filter-cell flex flex-col';
    selectEl.parentNode.insertBefore(wrap, selectEl);
    wrap.appendChild(selectEl);
    return wrap;
  }

  function ensureSearchOtherInput(selectEl, lang) {
    if (!selectEl) return null;
    const fieldKey = fieldKeyFromSelectId(selectEl.id);
    const inputId = selectEl.id + '-other';
    let input = document.getElementById(inputId);
    const cell = wrapSelectCell(selectEl);
    if (!input) {
      input = document.createElement('input');
      input.id = inputId;
      input.type = fieldKey === 'year' ? 'number' : 'text';
      input.className = 'vehicle-search-other-field mt-1 p-2 border border-gray-300 rounded-md filter-input';
      input.style.display = 'none';
      if (fieldKey === 'year') {
        input.min = '1900';
        input.max = String(new Date().getFullYear() + 2);
      }
      cell.appendChild(input);
    }
    const ph = OTHER_PLACEHOLDERS[fieldKey] || OTHER_PLACEHOLDERS.make;
    input.placeholder = lang === 'es' ? ph.es : ph.en;
    return input;
  }

  /** When make is "Other", hide model/trim dropdowns and use text inputs instead. */
  function updateSearchFieldVisibility(opts) {
    if (!opts || !opts.makeEl) return;
    const makeIsOther = opts.makeEl.value === 'other';

    if (opts.makeEl) {
      const makeInput = document.getElementById(opts.makeEl.id + '-other');
      if (makeInput) {
        makeInput.style.display = makeIsOther ? 'block' : 'none';
        if (!makeIsOther) makeInput.value = '';
      }
    }

    if (opts.yearEl) {
      const yearInput = document.getElementById(opts.yearEl.id + '-other');
      if (yearInput) {
        yearInput.style.display = opts.yearEl.value === 'other' ? 'block' : 'none';
        if (opts.yearEl.value !== 'other') yearInput.value = '';
      }
    }

    [opts.modelEl, opts.trimEl].forEach(function (sel) {
      if (!sel) return;
      const input = document.getElementById(sel.id + '-other');
      if (!input) return;

      if (makeIsOther) {
        sel.style.display = 'none';
        sel.dataset.directInputMode = 'true';
        sel.value = '';
        input.style.display = 'block';
      } else {
        sel.style.display = '';
        delete sel.dataset.directInputMode;
        if (sel.value === 'other') {
          input.style.display = 'block';
        } else {
          input.style.display = 'none';
          input.value = '';
        }
      }
    });
  }

  /** Value to send to Algolia facet filters (handles "Other" custom text). */
  function getFacetFilterValue(selectEl) {
    if (!selectEl) return '';
    const otherInput = document.getElementById(selectEl.id + '-other');

    if (selectEl.dataset.directInputMode === 'true' && otherInput) {
      return String(otherInput.value || '').trim();
    }

    if (selectEl.value === '' || selectEl.value == null) return '';
    if (selectEl.value === 'other') {
      return otherInput ? String(otherInput.value || '').trim() : '';
    }
    const opt = selectEl.options[selectEl.selectedIndex];
    if (!opt) return '';
    const text = (opt.textContent || '').trim();
    if (isPlaceholderOption(text)) return '';
    const fieldKey = fieldKeyFromSelectId(selectEl.id);
    if (fieldKey === 'year') return String(selectEl.value).trim();
    return text;
  }

  function initSearchFilters(opts) {
    const mode = opts.mode || 'car';
    const lang = opts.lang || 'es';
    const minYear = opts.yearMin || 1980;
    const maxYear = opts.yearMax || (new Date().getFullYear() + 1);
    const modelsMap = getModelsMap(mode);
    const makes = getMakes(mode);
    const includeOther = opts.includeOther !== false;
    const selectEls = [opts.yearEl, opts.makeEl, opts.modelEl, opts.trimEl];

    populateYears(opts.yearEl, minYear, maxYear, lang, includeOther);
    populateMakes(opts.makeEl, makes, lang, includeOther);
    populateModels(opts.modelEl, '', modelsMap, lang, includeOther);
    populateTrims(opts.trimEl, lang, includeOther);

    if (includeOther) {
      selectEls.forEach(function (sel) {
        ensureSearchOtherInput(sel, lang);
      });
      updateSearchFieldVisibility(opts);
    }

    function onMakeChange() {
      if (opts.makeEl.value !== 'other') {
        populateModels(opts.modelEl, opts.makeEl.value, modelsMap, lang, includeOther);
        populateTrims(opts.trimEl, lang, includeOther);
      }
      updateSearchFieldVisibility(opts);
      if (typeof opts.onChange === 'function') opts.onChange();
    }

    function onFieldChange() {
      updateSearchFieldVisibility(opts);
      if (typeof opts.onChange === 'function') opts.onChange();
    }

    opts.makeEl.addEventListener('change', onMakeChange);
    selectEls.forEach(function (sel) {
      if (!sel) return;
      sel.addEventListener('change', onFieldChange);
      if (includeOther) {
        const otherInput = document.getElementById(sel.id + '-other');
        if (otherInput) {
          otherInput.addEventListener('change', function () {
            if (typeof opts.onChange === 'function') opts.onChange();
          });
          otherInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && typeof opts.onChange === 'function') {
              e.preventDefault();
              opts.onChange();
            }
          });
        }
      }
    });
  }

  function initPostAdFilters(opts) {
    const mode = opts.mode || 'car';
    const lang = opts.lang || 'es';
    const minYear = opts.yearMin || 1980;
    const maxYear = opts.yearMax || (new Date().getFullYear() + 1);
    const modelsMap = getModelsMap(mode);
    const makes = getMakes(mode);

    populateYears(opts.yearEl, minYear, maxYear, lang, true);
    populateMakes(opts.makeEl, makes, lang, true);
    populateModels(opts.modelEl, '', modelsMap, lang, true);
    populateTrims(opts.trimEl, lang, true);

    function onMakeChange() {
      populateModels(opts.modelEl, opts.makeEl.value, modelsMap, lang, true);
      toggleOtherFields(opts);
    }

    opts.makeEl.addEventListener('change', onMakeChange);
    ['yearEl', 'makeEl', 'modelEl', 'trimEl'].forEach(function (key) {
      if (opts[key]) {
        opts[key].addEventListener('change', function () {
          toggleOtherFields(opts);
        });
      }
    });
    toggleOtherFields(opts);

    if (typeof opts.onReady === 'function') {
      opts.onReady();
    }
  }

  function toggleOtherFields(opts) {
    ['year', 'make', 'model', 'trim'].forEach(function (id) {
      const sel = document.getElementById('filter-' + id);
      const otherDiv = document.querySelector('.carquery-other-field[data-for="' + id + '"]');
      if (sel && otherDiv) {
        otherDiv.style.display = sel.value === 'other' ? 'block' : 'none';
      }
    });
  }

  function setSelectOrOther(fieldId, savedValue) {
    const sel = document.getElementById('filter-' + fieldId);
    const otherInput = document.getElementById('filter-' + fieldId + '-other');
    if (!sel || savedValue == null || savedValue === '') return;

    const saved = String(savedValue).trim();
    let found = false;
    for (let i = 0; i < sel.options.length; i++) {
      const opt = sel.options[i];
      if (opt.value !== 'other' && (opt.value === saved || opt.text === saved)) {
        sel.value = opt.value;
        found = true;
        break;
      }
    }
    if (!found && otherInput) {
      sel.value = 'other';
      otherInput.value = saved;
      const otherDiv = otherInput.closest('.carquery-other-field');
      if (otherDiv) otherDiv.style.display = 'block';
    }
  }

  function populatePostAdValues(ad, opts) {
    if (!ad) return;
    const mode = opts.mode || 'car';
    const modelsMap = getModelsMap(mode);

    setSelectOrOther('year', ad.year);

    if (ad.make) {
      setSelectOrOther('make', ad.make);
      populateModels(
        document.getElementById('filter-model'),
        document.getElementById('filter-make')?.value || '',
        modelsMap,
        opts.lang || 'es',
        true,
      );
    }
    if (ad.model) setSelectOrOther('model', ad.model);
    if (ad.trim) setSelectOrOther('trim', ad.trim);
    toggleOtherFields(opts);
  }

  function resetSearchSelects(opts) {
    const mode = opts.mode || 'car';
    const lang = opts.lang || 'es';
    const includeOther = opts.includeOther !== false;
    const modelsMap = getModelsMap(mode);
    const selectEls = [opts.yearEl, opts.makeEl, opts.modelEl, opts.trimEl];

    if (opts.yearEl) opts.yearEl.selectedIndex = 0;
    if (opts.makeEl) opts.makeEl.selectedIndex = 0;
    populateModels(opts.modelEl, '', modelsMap, lang, includeOther);
    populateTrims(opts.trimEl, lang, includeOther);
    selectEls.forEach(function (sel) {
      const input = sel && document.getElementById(sel.id + '-other');
      if (input) input.value = '';
      if (sel && sel.dataset.directInputMode) {
        sel.style.display = '';
        delete sel.dataset.directInputMode;
      }
    });
    updateSearchFieldVisibility(opts);
  }

  global.NunciaYaVehicleFilters = {
    initSearchFilters: initSearchFilters,
    initPostAdFilters: initPostAdFilters,
    populatePostAdValues: populatePostAdValues,
    resetSearchSelects: resetSearchSelects,
    getFacetFilterValue: getFacetFilterValue,
  };
})(typeof window !== 'undefined' ? window : global);
