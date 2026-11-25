/* =========================================================
   Honey Hungry — script.js (ใช้ร่วมกันทุกหน้า)
   - product.html : โหลดสินค้า + กรองตาม mood
   - order.html   : เติมฟอร์มจาก URL + ส่งออเดอร์ไป Apps Script
   - admin.html   : อ่านออเดอร์จาก Google Sheet (CSV) มาแสดงตาราง
   แต่ละส่วนจะทำงานเฉพาะเมื่อเจอ element ของหน้านั้น
   ========================================================= */

(function () {
  'use strict';

  /* ---------- Config ---------- */
  var APPS_SCRIPT_URL =
    'https://script.google.com/macros/s/AKfycbxCYq5bSBs9zb5Uwkec_XffL5d88yGuX64zHz6aWpCgw9XlJMFQJxslEuvfpcyqv38z9w/exec';

  var SHEET_CSV_URL =
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vRSUwTP_-b6vARPhTx1SYvnsKXp1yU_HI1nEddrs5ldBqFT7senkpzP1NHBQ1vpAnftxJMeGl_khfqq/pub?gid=0&single=true&output=csv';

  var MOODS = ['รสดั้งเดิม', 'รสมะลิ', 'รสหอมหมื่นลี้', 'รสกุหลาบ', 'รสเกลือ'];

  // mood (ไทย) -> class สีใน style.css
  var MOOD_CLASS = {
    'รสดั้งเดิม': 'mood-original',
    'รสมะลิ': 'mood-jasmine',
    'รสหอมหมื่นลี้': 'mood-osmanthus',
    'รสกุหลาบ': 'mood-rose',
    'รสเกลือ': 'mood-salted'
  };

  // ชื่อที่ยอมรับใน ?mood=xxx (ไทยเต็ม / ไทยไม่มีคำว่า "รส" / อังกฤษ)
  var MOOD_ALIASES = {
    'original': 'รสดั้งเดิม', 'ดั้งเดิม': 'รสดั้งเดิม',
    'jasmine': 'รสมะลิ', 'มะลิ': 'รสมะลิ',
    'osmanthus': 'รสหอมหมื่นลี้', 'หอมหมื่นลี้': 'รสหอมหมื่นลี้',
    'rose': 'รสกุหลาบ', 'กุหลาบ': 'รสกุหลาบ',
    'salted': 'รสเกลือ', 'เกลือ': 'รสเกลือ'
  };

  /* ---------- Helpers ---------- */
  function $(selector) {
    return document.querySelector(selector);
  }

  function formatPrice(n) {
    var num = Number(n);
    return isNaN(num) ? String(n) : num.toLocaleString('th-TH');
  }

  function resolveMood(raw) {
    if (!raw) return 'all';
    var v = String(raw).trim();
    if (MOODS.indexOf(v) !== -1) return v;
    var key = v.toLowerCase();
    return MOOD_ALIASES[key] || MOOD_ALIASES[v] || 'all';
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  /* =========================================================
     1) product.html
     ========================================================= */
  function initProductPage() {
    var filterBar = $('#filter-bar');
    var list = $('#product-list');
    if (!filterBar || !list) return;

    var products = [];
    var currentMood = resolveMood(new URLSearchParams(window.location.search).get('mood'));

    function buildFilterBar() {
      filterBar.innerHTML = '';
      ['all'].concat(MOODS).forEach(function (mood) {
        var btn = el('button', 'filter-btn', mood === 'all' ? 'ทั้งหมด' : mood);
        btn.type = 'button';
        btn.setAttribute('data-mood', mood);
        btn.addEventListener('click', function () {
          currentMood = mood;
          updateActiveButton();
          renderProducts();
        });
        filterBar.appendChild(btn);
      });
      updateActiveButton();
    }

    function updateActiveButton() {
      var buttons = filterBar.querySelectorAll('.filter-btn');
      for (var i = 0; i < buttons.length; i++) {
        var active = buttons[i].getAttribute('data-mood') === currentMood;
        buttons[i].classList.toggle('is-active', active);
        buttons[i].setAttribute('aria-pressed', active ? 'true' : 'false');
      }
    }

    function buildCard(p) {
      var card = el('article', 'product-card ' + (MOOD_CLASS[p.mood] || ''));

      var imgWrap = el('div', 'product-card__image');
      var img = document.createElement('img');
      img.src = p.image;
      img.alt = p.name;
      img.loading = 'lazy';
      img.addEventListener('error', function () {
        img.style.display = 'none';
      });
      imgWrap.appendChild(img);

      var body = el('div', 'product-card__body');

      var meta = el('div', 'product-card__meta');
      meta.appendChild(el('span', 'mood-dot'));
      meta.appendChild(el('span', '', p.mood));

      var title = el('h3', 'product-card__title', p.name);

      var foot = el('div', 'product-card__foot');
      foot.appendChild(el('span', 'size', p.size));
      var price = el('span', 'price', formatPrice(p.price));
      price.appendChild(el('small', '', 'บาท'));
      foot.appendChild(price);

      // ชื่อสินค้าที่ส่งไปหน้า order เช่น "Honey Hungry รสดั้งเดิม 100ml"
      var itemName = 'Honey Hungry ' + p.mood + ' ' + String(p.size).replace(/\s+/g, '');
      var orderLink = el('a', 'btn btn--block mt-md', 'สั่งซื้อ');
      orderLink.href =
        'order.html?item=' + encodeURIComponent(itemName) +
        '&price=' + encodeURIComponent(p.price);

      body.appendChild(meta);
      body.appendChild(title);
      body.appendChild(foot);
      body.appendChild(orderLink);

      card.appendChild(imgWrap);
      card.appendChild(body);
      return card;
    }

    function renderProducts() {
      list.innerHTML = '';
      var shown = products.filter(function (p) {
        return currentMood === 'all' || p.mood === currentMood;
      });

      if (!shown.length) {
        list.appendChild(el('p', 'text-center', 'ไม่พบสินค้าในหมวดนี้'));
        return;
      }
      shown.forEach(function (p) {
        list.appendChild(buildCard(p));
      });
    }

    buildFilterBar();

    fetch('products.json')
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        products = data;
        renderProducts();
      })
      .catch(function (error) {
        console.error(error);
        list.innerHTML = '';
        list.appendChild(el('p', 'text-center', 'ไม่สามารถโหลดรายการสินค้าได้ กรุณาลองใหม่อีกครั้ง'));
      });
  }

  /* =========================================================
     2) order.html
     ========================================================= */
  function initOrderPage() {
    var form = $('#orderForm');
    if (!form) return;

    var params = new URLSearchParams(window.location.search);
    var item = params.get('item');
    var price = params.get('price');

    // เติมทั้งชื่อสินค้า (#items) และราคา (#total) ทันทีที่โหลดหน้า
    var itemsInput = $('#items');
    var totalInput = $('#total');
    if (itemsInput && item !== null) itemsInput.value = item;
    if (totalInput && price !== null) totalInput.value = price;

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var payload = {
        customerName: $('#customerName').value.trim(),
        contact: $('#contact').value.trim(),
        items: $('#items').value.trim(),
        total: $('#total').value.trim(),
        note: $('#note') ? $('#note').value.trim() : ''
      };

      var submitBtn = form.querySelector('[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
      })
      .then(function () { window.location.href = 'thankyou.html'; })
      .catch(function (error) {
        console.error(error);
        alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
        if (submitBtn) submitBtn.disabled = false;
      });
    });
  }

  /* =========================================================
     3) admin.html
     ========================================================= */

  // parse CSV เอง: รองรับ "ข้อความมี, คอมมา", "" (quote ซ้อน) และขึ้นบรรทัดใหม่ในช่อง
  function parseCSV(text) {
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1); // ตัด BOM

    var rows = [];
    var row = [];
    var field = '';
    var inQuotes = false;

    for (var i = 0; i < text.length; i++) {
      var ch = text[i];

      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else { inQuotes = false; }
        } else {
          field += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(field); field = '';
      } else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(field); field = '';
        rows.push(row); row = [];
      } else {
        field += ch;
      }
    }
    if (field !== '' || row.length) {
      row.push(field);
      rows.push(row);
    }

    // ตัดแถวว่าง
    return rows.filter(function (r) {
      return r.some(function (c) { return c.trim() !== ''; });
    });
  }

  function initAdminPage() {
    var tbody = $('#ordersTable tbody');
    if (!tbody) return;

    function showMessage(msg) {
      tbody.innerHTML = '';
      var tr = document.createElement('tr');
      var td = el('td', 'text-center', msg);
      td.colSpan = 6;
      tr.appendChild(td);
      tbody.appendChild(tr);
    }

    showMessage('กำลังโหลดข้อมูล...');

    var url = SHEET_CSV_URL + '&_=' + Date.now(); // กัน cache

    fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(function (csv) {
        var rows = parseCSV(csv);
        rows.shift(); // ตัดแถวหัวตาราง

        if (!rows.length) {
          showMessage('ยังไม่มีรายการสั่งซื้อ');
          return;
        }

        // ชีตเพิ่มแถวใหม่ต่อท้ายเสมอ -> กลับลำดับให้รายการล่าสุดขึ้นก่อน
        rows.reverse();

        tbody.innerHTML = '';
        rows.forEach(function (r) {
          var tr = document.createElement('tr');
          // วันเวลา, ชื่อลูกค้า, เบอร์โทร/Line, รายการสินค้า, จำนวนเงินรวม, หมายเหตุ
          for (var c = 0; c < 6; c++) {
            var value = r[c] !== undefined ? r[c] : '';
            if (c === 4 && value !== '' && !isNaN(Number(value))) {
              value = formatPrice(value) + ' บาท';
            }
            // textContent กัน HTML/สคริปต์แปลกปลอมจากข้อมูลที่ลูกค้ากรอก
            tr.appendChild(el('td', '', value));
          }
          tbody.appendChild(tr);
        });
      })
      .catch(function (error) {
        console.error(error);
        showMessage('ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
      });
  }

  /* ---------- Init ---------- */
  function init() {
    initProductPage();
    initOrderPage();
    initAdminPage();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
