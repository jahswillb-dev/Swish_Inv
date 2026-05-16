(function() {
    var app = document.getElementById('app');
    var state = {
      token: localStorage.getItem('isd_token') || '',
      user: null,
      route: 'dashboard',
      dashboard: null,
      documents: { quotation: [], invoice: [] },
      filters: {
        quotation: { search: '', status: '' },
        invoice: { search: '', status: '' }
      },
      form: null,
      viewDocument: null,
      users: [],
      userForm: null,
      mobileOpen: false,
      loading: false,
      toast: null
    };

    var statusOptions = {
      quotation: ['Draft', 'Sent', 'Accepted', 'Converted', 'Declined', 'Expired'],
      invoice: ['Draft', 'Sent', 'Part Paid', 'Paid', 'Overdue', 'Cancelled']
    };

    var COMPANY = {
      appName: 'Swish Innovation Desk',
      name: 'SWISH INNOVATION',
      legalName: 'Swish Innovation Limited',
      addressLines: ['No 4 Gambia Avenue', 'Barnawa, Kaduna'],
      phone: '08067737863',
      mobile: '08061983865',
      email: 'swishinnovation@gmail.com',
      website: 'www.swishinnovation.com',
      socials: ['Facebook: swishinnovation', 'Instagram: swishinnovation'],
      bankName: 'Zenith Bank',
      accountNumber: '1219882922',
      accountName: 'Swish Innovation Limited',
      vatNumber: '22597609-0001',
      logo: window.SWISH_LOGO_DATA_URI || '',
      favicon: window.SWISH_FAVICON_DATA_URI || ''
    };

    var routeMeta = {
      dashboard: { label: 'Dashboard', icon: 'layout-dashboard' },
      create: { label: 'Create', icon: 'file-plus-2' },
      quotations: { label: 'Quotations', icon: 'scroll-text' },
      invoices: { label: 'Invoices', icon: 'receipt-text' },
      users: { label: 'Users', icon: 'users-round' }
    };

    function api(functionName) {
      var args = Array.prototype.slice.call(arguments, 1);
      return postToBackend(functionName, args);
    }

    function postToBackend(method, args) {
      var backendUrl = window.SWISH_BACKEND_URL || '';
      if (!backendUrl || backendUrl.indexOf('PASTE_APPS_SCRIPT_WEB_APP_URL_HERE') !== -1) {
        return Promise.reject(new Error('Set SWISH_BACKEND_URL in frontend/config.js after deploying the Apps Script backend.'));
      }

      return new Promise(function(resolve, reject) {
        var id = 'req_' + Date.now() + '_' + Math.round(Math.random() * 1000000);
        var frameName = 'swish_api_' + id;
        var iframe = document.createElement('iframe');
        var form = document.createElement('form');
        var timeout;

        iframe.name = frameName;
        iframe.title = 'Swish Innovation API Response';
        iframe.style.cssText = 'position:absolute;width:1px;height:1px;border:0;opacity:0;pointer-events:none;left:-9999px;top:-9999px;';

        form.method = 'POST';
        form.action = backendUrl;
        form.target = frameName;
        form.style.display = 'none';

        addHidden(form, 'id', id);
        addHidden(form, 'method', method);
        addHidden(form, 'args', JSON.stringify(args || []));
        addHidden(form, 'origin', window.location.origin);

        function cleanup() {
          window.clearTimeout(timeout);
          window.removeEventListener('message', onMessage);
          if (form.parentNode) form.parentNode.removeChild(form);
          window.setTimeout(function() {
            if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
          }, 500);
        }

        function onMessage(event) {
          var message = event.data || {};
          if (!message.swishApi || message.id !== id) return;
          cleanup();
          if (message.ok) {
            resolve(message.result);
          } else {
            reject(new Error(message.error || 'Backend request failed.'));
          }
        }

        timeout = window.setTimeout(function() {
          cleanup();
          reject(new Error('Backend request timed out. Check the Apps Script Web App deployment and redeploy the latest Code.gs.'));
        }, 30000);

        window.addEventListener('message', onMessage);
        document.body.appendChild(iframe);
        document.body.appendChild(form);
        form.submit();
      });
    }

    function addHidden(form, name, value) {
      var input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      form.appendChild(input);
    }

    function init() {
      if (!state.token) {
        render();
        return;
      }

      state.loading = true;
      render();
      api('getBootstrap', state.token)
        .then(function(result) {
          state.user = result.user;
          state.dashboard = result.dashboard;
          state.loading = false;
          render();
        })
        .catch(function(error) {
          localStorage.removeItem('isd_token');
          state.token = '';
          state.user = null;
          state.loading = false;
          setToast(error.message, 'error');
          render();
        });
    }

    function render() {
      if (!state.user) {
        renderLogin();
        return;
      }

      app.className = '';
      app.innerHTML = [
        '<div class="app-shell">',
        renderSidebar(),
        '<main class="main">',
        renderTopbar(),
        '<section class="content">',
        renderRoute(),
        '</section>',
        '</main>',
        '</div>',
        state.viewDocument ? renderDocumentModal(state.viewDocument) : '',
        state.toast ? renderToast() : ''
      ].join('');
      refreshIcons();
      refreshTotalsPreview();
    }

    function brandMark() {
      return COMPANY.logo
        ? '<div class="brand-mark"><img src="' + COMPANY.logo + '" alt="Swish Innovation"></div>'
        : '<div class="brand-mark">SI</div>';
    }

    function renderLogin() {
      app.className = 'login-page';
      app.innerHTML = [
        '<section class="login-visual">',
        '<div class="brand">' + brandMark() + '<div><div class="brand-title">Swish Innovation Desk</div><div class="brand-subtitle">Quotations and invoices</div></div></div>',
        '<div><h1>Swish Innovation Desk</h1><p>Secure billing workspace for decoration projects, fit-outs, renovation work, and general contracting.</p></div>',
        '<div class="small">Google Sheets backed operations</div>',
        '</section>',
        '<section class="login-panel">',
        brandMark(),
        '<h2>Sign in</h2>',
        '<div class="muted">Create, track, and approve commercial documents from one workspace.</div>',
        '<form data-form="login" class="stack-list">',
        '<div class="field"><label>Email</label><input name="email" type="email" autocomplete="email" required></div>',
        '<div class="field"><label>Password</label><input name="password" type="password" autocomplete="current-password" required></div>',
        '<button class="primary-button" type="submit"><i data-lucide="log-in"></i><span>Sign in</span></button>',
        '</form>',
        state.toast ? renderToast() : '',
        '</section>'
      ].join('');
      refreshIcons();
    }

    function renderSidebar() {
      var routes = ['dashboard', 'create', 'quotations', 'invoices'];
      if (state.user.role === 'manager') routes.push('users');

      return [
        '<aside class="sidebar ' + (state.mobileOpen ? 'open' : '') + '">',
        '<div class="brand">' + brandMark() + '<div><div class="brand-title">Swish Innovation Desk</div><div class="brand-subtitle">Decor and contracting</div></div></div>',
        '<nav class="nav">',
        routes.map(function(route) {
          var meta = routeMeta[route];
          return [
            '<button type="button" class="nav-button ' + (state.route === route ? 'active' : '') + '" data-action="nav" data-route="' + route + '">',
            '<i data-lucide="' + meta.icon + '"></i><span>' + meta.label + '</span>',
            '</button>'
          ].join('');
        }).join(''),
        '</nav>',
        '<div class="sidebar-footer">',
        '<div class="user-card"><strong>' + escapeHtml(state.user.name) + '</strong><div class="small">' + escapeHtml(state.user.email) + '</div><div class="chip ' + escapeHtml(state.user.role) + '">' + titleCase(state.user.role) + '</div></div>',
        '<button type="button" class="ghost-button" data-action="logout"><i data-lucide="log-out"></i><span>Sign out</span></button>',
        '</div>',
        '</aside>'
      ].join('');
    }

    function renderTopbar() {
      var meta = routeMeta[state.route] || routeMeta.dashboard;
      return [
        '<header class="topbar">',
        '<div class="row-between">',
        '<button type="button" class="icon-button mobile-menu" title="Menu" data-action="toggle-menu"><i data-lucide="menu"></i></button>',
        '<div><h1>' + meta.label + '</h1><div class="small">' + pageCaption() + '</div></div>',
        '</div>',
        '<div class="topbar-actions">',
        '<button type="button" class="ghost-button" data-action="new-doc" data-type="quotation"><i data-lucide="scroll-text"></i><span>Quotation</span></button>',
        '<button type="button" class="primary-button" data-action="new-doc" data-type="invoice"><i data-lucide="receipt-text"></i><span>Invoice</span></button>',
        '</div>',
        '</header>'
      ].join('');
    }

    function pageCaption() {
      if (state.route === 'dashboard') return state.user.role === 'manager' ? 'All team activity' : 'Your activity';
      if (state.route === 'create') return state.form && state.form.id ? 'Modify commercial document' : 'New commercial document';
      if (state.route === 'quotations') return state.user.role === 'manager' ? 'All quotations' : 'Your quotations';
      if (state.route === 'invoices') return state.user.role === 'manager' ? 'All invoices' : 'Your invoices';
      if (state.route === 'users') return 'Team access';
      return '';
    }

    function renderRoute() {
      if (state.route === 'dashboard') return renderDashboard();
      if (state.route === 'create') return renderCreate();
      if (state.route === 'quotations') return renderDocuments('quotation');
      if (state.route === 'invoices') return renderDocuments('invoice');
      if (state.route === 'users') return renderUsers();
      return renderDashboard();
    }

    function renderDashboard() {
      var dashboard = state.dashboard || emptyDashboard();
      var currency = dashboard.recentDocuments[0] ? dashboard.recentDocuments[0].currency : 'NGN';
      var cards = dashboard.cards;

      return [
        '<div class="kpi-grid">',
        kpiCard('Quotation pipeline', money(cards.quotationValue, currency), cards.quotationCount + ' documents', 'scroll-text', 'quotation'),
        kpiCard('Invoice value', money(cards.invoiceValue, currency), cards.invoiceCount + ' documents', 'receipt-text', 'invoice'),
        kpiCard('Paid revenue', money(cards.paidValue, currency), cards.conversionRate + '% quote conversion', 'badge-check', 'paid'),
        kpiCard('Outstanding', money(cards.outstandingValue, currency), 'Unpaid live invoices', 'wallet-cards', 'overdue'),
        '</div>',
        '<div class="insight-grid">',
        '<section class="panel"><div class="panel-header"><h2 class="panel-title">Monthly invoice value</h2><button type="button" class="icon-button" title="Refresh" data-action="refresh-dashboard"><i data-lucide="refresh-cw"></i></button></div><div class="panel-body">' + renderBars(dashboard.monthlyRevenue, currency) + '</div></section>',
        '<section class="panel"><div class="panel-header"><h2 class="panel-title">Top clients</h2></div><div class="panel-body">' + renderTopClients(dashboard.topClients, currency) + '</div></section>',
        '</div>',
        '<div class="insight-grid">',
        '<section class="panel"><div class="panel-header"><h2 class="panel-title">Recent documents</h2></div><div class="panel-body">' + renderRecentDocuments(dashboard.recentDocuments) + '</div></section>',
        '<section class="panel"><div class="panel-header"><h2 class="panel-title">Status mix</h2></div><div class="panel-body">' + renderStatusMix(dashboard.statusBreakdown) + '</div></section>',
        '</div>'
      ].join('');
    }

    function kpiCard(label, value, note, icon, chipClass) {
      return [
        '<article class="kpi-card">',
        '<div class="kpi-top"><span>' + label + '</span><span class="chip ' + chipClass + '"><i data-lucide="' + icon + '"></i></span></div>',
        '<div class="kpi-value amount">' + value + '</div>',
        '<div class="small">' + note + '</div>',
        '</article>'
      ].join('');
    }

    function renderBars(months, currency) {
      if (!months || !months.length) return emptyState('No invoice activity yet.');
      var max = Math.max.apply(null, months.map(function(month) { return month.value; }).concat([1]));
      return [
        '<div class="bar-chart">',
        months.map(function(month, index) {
          var height = Math.max(8, Math.round(month.value / max * 190));
          return [
            '<div class="bar-wrap" title="' + escapeAttr(money(month.value, currency)) + '">',
            '<div class="small amount">' + moneyCompact(month.value, currency) + '</div>',
            '<div class="bar" style="height:' + height + 'px; background:' + (index % 2 ? 'var(--teal)' : 'var(--green)') + '"></div>',
            '<div class="bar-label">' + escapeHtml(month.label) + '</div>',
            '</div>'
          ].join('');
        }).join(''),
        '</div>'
      ].join('');
    }

    function renderTopClients(clients, currency) {
      if (!clients || !clients.length) return emptyState('No client revenue yet.');
      var max = Math.max.apply(null, clients.map(function(client) { return client.value; }).concat([1]));
      return '<div class="stack-list">' + clients.map(function(client) {
        return [
          '<div class="stack-row">',
          '<div class="row-between"><strong>' + escapeHtml(client.client) + '</strong><span class="amount">' + money(client.value, currency) + '</span></div>',
          '<div class="mini-meter"><span style="width:' + Math.max(4, Math.round(client.value / max * 100)) + '%"></span></div>',
          '</div>'
        ].join('');
      }).join('') + '</div>';
    }

    function renderStatusMix(rows) {
      if (!rows || !rows.length) return emptyState('No statuses yet.');
      return '<div class="stack-list">' + rows.map(function(row) {
        return '<div class="row-between"><span class="chip ' + escapeAttr(row.type) + '">' + titleCase(row.type) + '</span><span>' + escapeHtml(row.status) + '</span><strong>' + row.count + '</strong></div>';
      }).join('') + '</div>';
    }

    function renderRecentDocuments(documents) {
      if (!documents || !documents.length) return emptyState('No documents yet.');
      return [
        '<div class="table-scroll"><table class="data-table"><thead><tr><th>No.</th><th>Client</th><th>Type</th><th>Status</th><th>Total</th><th></th></tr></thead><tbody>',
        documents.map(function(doc) {
          return [
            '<tr>',
            '<td><strong>' + escapeHtml(doc.documentNumber) + '</strong><div class="small">' + formatDate(doc.issueDate) + '</div></td>',
            '<td>' + escapeHtml(doc.clientName) + '<div class="small">' + escapeHtml(doc.projectTitle) + '</div></td>',
            '<td><span class="chip ' + doc.type + '">' + titleCase(doc.type) + '</span></td>',
            '<td>' + statusChip(doc.status) + '</td>',
            '<td class="amount">' + money(doc.total, doc.currency) + '</td>',
            '<td><button type="button" class="icon-button" title="View" data-action="view-doc" data-id="' + escapeAttr(doc.id) + '"><i data-lucide="eye"></i></button></td>',
            '</tr>'
          ].join('');
        }).join(''),
        '</tbody></table></div>'
      ].join('');
    }

    function renderCreate() {
      if (!state.form) state.form = defaultDocument('quotation');
      var form = state.form;
      var isEdit = !!form.id;
      var canSubmit = !isEdit || state.user.role === 'manager';
      var options = statusOptions[form.type] || statusOptions.quotation;

      return [
        '<form id="documentForm" data-form="document" class="stack-list">',
        '<section class="panel">',
        '<div class="panel-header form-head">',
        '<div><h2 class="panel-title">' + (isEdit ? escapeHtml(form.documentNumber) : 'Create document') + '</h2><div class="small">' + titleCase(form.type) + '</div></div>',
        '<div class="segment">',
        segmentButton('quotation', form.type === 'quotation', 'Quotation'),
        segmentButton('invoice', form.type === 'invoice', 'Invoice'),
        '</div>',
        '</div>',
        '<div class="panel-body">',
        '<input type="hidden" name="id" value="' + escapeAttr(form.id || '') + '">',
        '<input type="hidden" name="type" value="' + escapeAttr(form.type) + '">',
        '<input type="hidden" name="convertedFrom" value="' + escapeAttr(form.convertedFrom || '') + '">',
        '<div class="form-grid">',
        field('Client name', 'clientName', form.clientName, 'text', 'span-4', true),
        field('Client email', 'clientEmail', form.clientEmail, 'email', 'span-4', false),
        field('Client phone', 'clientPhone', form.clientPhone, 'tel', 'span-4', false),
        textArea('Client address', 'clientAddress', form.clientAddress, 'span-6'),
        textArea('Project address', 'projectAddress', form.projectAddress, 'span-6'),
        field('Project title', 'projectTitle', form.projectTitle, 'text', 'span-5', true),
        selectField('Status', 'status', form.status || 'Draft', options, 'span-3'),
        field('Issue date', 'issueDate', form.issueDate || todayInput(), 'date', 'span-2', true),
        field(form.type === 'invoice' ? 'Due date' : 'Valid until', 'dueDate', form.dueDate || todayInput(), 'date', 'span-2', false),
        '</div>',
        '</div>',
        '</section>',
        '<section class="panel">',
        '<div class="panel-header"><h2 class="panel-title">Line items</h2><button type="button" class="ghost-button" data-action="add-line"><i data-lucide="plus"></i><span>Add item</span></button></div>',
        '<div class="panel-body">',
        renderLineItems(form.items || []),
        '</div>',
        '</section>',
        '<section class="panel">',
        '<div class="panel-header"><h2 class="panel-title">Commercial terms</h2></div>',
        '<div class="panel-body">',
        '<div class="form-grid">',
        field('Currency', 'currency', form.currency || 'NGN', 'text', 'span-2', true),
        field('Discount', 'discount', form.discount || 0, 'number', 'span-2', false, '0.01'),
        field('Tax rate %', 'taxRate', form.taxRate || 0, 'number', 'span-2', false, '0.01'),
        textArea('Notes', 'notes', form.notes, 'span-6'),
        textArea('Terms', 'terms', form.terms, 'span-12'),
        '</div>',
        '<div class="totals-grid" id="totalsPreview"></div>',
        '</div>',
        '</section>',
        '<div class="row-between">',
        '<button type="button" class="ghost-button" data-action="new-doc" data-type="' + escapeAttr(form.type) + '"><i data-lucide="rotate-ccw"></i><span>Clear</span></button>',
        canSubmit ? '<button type="submit" class="primary-button"><i data-lucide="save"></i><span>' + (isEdit ? 'Save changes' : 'Save document') + '</span></button>' : '<span class="chip">Saved documents are manager editable</span>',
        '</div>',
        '</form>'
      ].join('');
    }

    function segmentButton(type, active, label) {
      return '<button type="button" class="segment-button ' + (active ? 'active' : '') + '" data-action="switch-type" data-type="' + type + '">' + label + '</button>';
    }

    function field(label, name, value, type, span, required, step) {
      var fieldValue = value === undefined || value === null ? '' : value;
      return [
        '<div class="field ' + span + '">',
        '<label>' + label + '</label>',
        '<input name="' + name + '" type="' + type + '" value="' + escapeAttr(fieldValue) + '" ' + (required ? 'required' : '') + (step ? ' step="' + step + '"' : '') + '>',
        '</div>'
      ].join('');
    }

    function selectField(label, name, value, options, span) {
      return [
        '<div class="field ' + span + '"><label>' + label + '</label><select name="' + name + '">',
        options.map(function(option) {
          return '<option value="' + escapeAttr(option) + '" ' + (option === value ? 'selected' : '') + '>' + escapeHtml(option) + '</option>';
        }).join(''),
        '</select></div>'
      ].join('');
    }

    function textArea(label, name, value, span) {
      return '<div class="field ' + span + '"><label>' + label + '</label><textarea name="' + name + '">' + escapeHtml(value || '') + '</textarea></div>';
    }

    function renderLineItems(items) {
      var rows = items.length ? items : [blankItem()];
      return [
        '<div class="table-scroll"><table class="line-table"><thead><tr><th>Category</th><th>Room</th><th>Description</th><th>Qty</th><th>Unit</th><th>Rate</th><th>Amount</th><th></th></tr></thead><tbody>',
        rows.map(function(item, index) {
          return [
            '<tr data-line-index="' + index + '">',
            '<td><input data-item-field="category" value="' + escapeAttr(item.category || '') + '"></td>',
            '<td><input data-item-field="room" value="' + escapeAttr(item.room || '') + '"></td>',
            '<td><input data-item-field="description" value="' + escapeAttr(item.description || '') + '" required></td>',
            '<td><input data-item-field="quantity" type="number" min="0" step="0.01" value="' + escapeAttr(item.quantity || 1) + '"></td>',
            '<td><input data-item-field="unit" value="' + escapeAttr(item.unit || 'item') + '"></td>',
            '<td><input data-item-field="unitPrice" type="number" min="0" step="0.01" value="' + escapeAttr(item.unitPrice || 0) + '"></td>',
            '<td class="amount" data-line-amount>' + money((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), state.form.currency || 'NGN') + '</td>',
            '<td><button type="button" class="icon-button" title="Remove" data-action="remove-line" data-index="' + index + '"><i data-lucide="trash-2"></i></button></td>',
            '</tr>'
          ].join('');
        }).join(''),
        '</tbody></table></div>'
      ].join('');
    }

    function renderDocuments(type) {
      var title = type === 'invoice' ? 'Invoices' : 'Quotations';
      var filters = state.filters[type];
      var documents = state.documents[type] || [];
      var options = statusOptions[type] || [];

      return [
        '<section class="panel">',
        '<div class="panel-header table-toolbar">',
        '<h2 class="panel-title">' + title + '</h2>',
        '<form data-form="filter" data-type="' + type + '" class="table-toolbar">',
        '<div class="search-group"><input name="search" placeholder="Search" value="' + escapeAttr(filters.search) + '"><select name="status"><option value="">All statuses</option>',
        options.map(function(option) {
          return '<option value="' + escapeAttr(option) + '" ' + (filters.status === option ? 'selected' : '') + '>' + escapeHtml(option) + '</option>';
        }).join(''),
        '</select></div>',
        '<button type="submit" class="ghost-button"><i data-lucide="search"></i><span>Filter</span></button>',
        '<button type="button" class="icon-button" title="Refresh" data-action="refresh-docs" data-type="' + type + '"><i data-lucide="refresh-cw"></i></button>',
        '</form>',
        '</div>',
        '<div class="panel-body">',
        documents.length ? renderDocumentTable(documents) : emptyState('No ' + title.toLowerCase() + ' yet.'),
        '</div>',
        '</section>'
      ].join('');
    }

    function renderDocumentTable(documents) {
      return [
        '<div class="table-scroll"><table class="data-table"><thead><tr><th>No.</th><th>Client</th><th>Status</th><th>Issued</th><th>Total</th>' + (state.user.role === 'manager' ? '<th>Creator</th>' : '') + '<th></th></tr></thead><tbody>',
        documents.map(function(doc) {
          return [
            '<tr>',
            '<td><strong>' + escapeHtml(doc.documentNumber) + '</strong><div class="small">' + titleCase(doc.type) + '</div></td>',
            '<td>' + escapeHtml(doc.clientName) + '<div class="small">' + escapeHtml(doc.projectTitle) + '</div></td>',
            '<td>' + statusChip(doc.status) + '</td>',
            '<td>' + formatDate(doc.issueDate) + '<div class="small">' + formatDate(doc.dueDate) + '</div></td>',
            '<td class="amount">' + money(doc.total, doc.currency) + '</td>',
            state.user.role === 'manager' ? '<td>' + escapeHtml(doc.createdByName || '') + '</td>' : '',
            '<td><div class="document-actions"><button type="button" class="icon-button" title="View" data-action="view-doc" data-id="' + escapeAttr(doc.id) + '"><i data-lucide="eye"></i></button>' + (state.user.role === 'manager' ? '<button type="button" class="icon-button" title="Edit" data-action="edit-doc" data-id="' + escapeAttr(doc.id) + '"><i data-lucide="pencil"></i></button>' : '') + '</div></td>',
            '</tr>'
          ].join('');
        }).join(''),
        '</tbody></table></div>'
      ].join('');
    }

    function renderDocumentModal(doc) {
      return [
        '<div class="modal-backdrop" data-action="close-modal">',
        '<article class="modal-card" role="dialog" aria-modal="true">',
        '<div class="panel-header">',
        '<div><h2 class="panel-title">' + escapeHtml(doc.documentNumber) + '</h2><div class="small">' + escapeHtml(doc.clientName) + ' Â· ' + escapeHtml(doc.projectTitle) + '</div></div>',
        '<div class="topbar-actions">',
        '<button type="button" class="ghost-button" data-action="print-doc"><i data-lucide="printer"></i><span>Print</span></button>',
        doc.type === 'quotation' && state.user.role === 'manager' ? '<button type="button" class="ghost-button" data-action="convert-doc" data-id="' + escapeAttr(doc.id) + '"><i data-lucide="repeat-2"></i><span>Invoice</span></button>' : '',
        state.user.role === 'manager' ? '<button type="button" class="ghost-button" data-action="edit-doc" data-id="' + escapeAttr(doc.id) + '"><i data-lucide="pencil"></i><span>Edit</span></button>' : '',
        state.user.role === 'manager' ? '<button type="button" class="danger-button" data-action="delete-doc" data-id="' + escapeAttr(doc.id) + '"><i data-lucide="trash-2"></i><span>Delete</span></button>' : '',
        '<button type="button" class="icon-button" title="Close" data-action="close-modal"><i data-lucide="x"></i></button>',
        '</div>',
        '</div>',
        '<div class="modal-body stack-list">',
        '<div class="form-grid">',
        detail('Type', titleCase(doc.type), 'span-3'),
        detail('Status', statusChip(doc.status), 'span-3', true),
        detail('Issue date', formatDate(doc.issueDate), 'span-3'),
        detail(doc.type === 'invoice' ? 'Due date' : 'Valid until', formatDate(doc.dueDate), 'span-3'),
        detail('Client email', doc.clientEmail || '-', 'span-4'),
        detail('Client phone', doc.clientPhone || '-', 'span-4'),
        detail('Created by', doc.createdByName || '-', 'span-4'),
        detail('Client address', doc.clientAddress || '-', 'span-6'),
        detail('Project address', doc.projectAddress || '-', 'span-6'),
        '</div>',
        '<div class="table-scroll"><table class="data-table"><thead><tr><th>Category</th><th>Room</th><th>Description</th><th>Qty</th><th>Unit</th><th>Rate</th><th>Amount</th></tr></thead><tbody>',
        (doc.items || []).map(function(item) {
          return '<tr><td>' + escapeHtml(item.category || '') + '</td><td>' + escapeHtml(item.room || '') + '</td><td>' + escapeHtml(item.description || '') + '</td><td class="number">' + item.quantity + '</td><td>' + escapeHtml(item.unit || '') + '</td><td class="amount">' + money(item.unitPrice, doc.currency) + '</td><td class="amount">' + money(item.amount, doc.currency) + '</td></tr>';
        }).join(''),
        '</tbody></table></div>',
        '<div class="totals-grid">',
        totalRow('Subtotal', money(doc.subtotal, doc.currency)),
        totalRow('Discount', money(doc.discount, doc.currency)),
        totalRow('Tax', money(doc.tax, doc.currency) + ' (' + doc.taxRate + '%)'),
        totalRow('Total', money(doc.total, doc.currency), true),
        '</div>',
        doc.notes ? '<section><h3 class="panel-title">Notes</h3><p>' + escapeHtml(doc.notes) + '</p></section>' : '',
        doc.terms ? '<section><h3 class="panel-title">Terms</h3><p>' + escapeHtml(doc.terms) + '</p></section>' : '',
        '</div>',
        '</article>',
        '</div>'
      ].join('');
    }

    function printDocument(doc) {
      var oldMount = document.getElementById('swishPrintMount');
      var oldStyles = document.getElementById('swishPrintStyles');
      if (oldMount) oldMount.parentNode.removeChild(oldMount);
      if (oldStyles) oldStyles.parentNode.removeChild(oldStyles);

      var style = document.createElement('style');
      style.id = 'swishPrintStyles';
      style.textContent = printStyles();
      document.head.appendChild(style);

      var mount = document.createElement('div');
      mount.id = 'swishPrintMount';
      mount.innerHTML = doc.type === 'invoice' ? renderInvoicePrint(doc) : renderQuotationPrint(doc);
      document.body.appendChild(mount);

      document.body.classList.add('swish-printing');

      var cleaned = false;
      function cleanup() {
        if (cleaned) return;
        cleaned = true;
        document.body.classList.remove('swish-printing');
        window.removeEventListener('afterprint', cleanup);
        if (mount.parentNode) mount.parentNode.removeChild(mount);
        if (style.parentNode) style.parentNode.removeChild(style);
      }

      window.addEventListener('afterprint', cleanup);
      window.setTimeout(function() {
        window.print();
        window.setTimeout(cleanup, 1200);
      }, 120);
    }

    function renderQuotationPrint(doc) {
      var items = doc.items || [];
      var denseClass = items.length > 8 ? ' print-dense' : '';
      return [
        '<main class="print-page quote-print' + denseClass + '">',
        '<aside class="quote-rail">',
        printLogo('quote-logo'),
        '<section class="quote-rail-section bill"><h2>BILL TO:</h2><strong>' + escapeHtml(doc.clientName) + '</strong>',
        '<span>Phone Number: ' + escapeHtml(doc.clientPhone || '-') + '</span>',
        '<span>Email: ' + escapeHtml(doc.clientEmail || '-') + '</span></section>',
        '<section class="quote-rail-section payment"><h2>PAYMENT</h2><span>BANK ACCOUNT</span><span>' + escapeHtml(COMPANY.bankName) + '</span><span>' + escapeHtml(COMPANY.accountNumber) + '</span><span>' + escapeHtml(COMPANY.accountName) + '</span><h2>VAT NUMBER</h2><span>' + escapeHtml(COMPANY.vatNumber) + '</span></section>',
        '<section class="quote-socials">' + COMPANY.socials.map(escapeHtml).join('<br>') + '</section>',
        '</aside>',
        '<section class="quote-sheet">',
        '<header class="quote-company">' + companyAddressBlock() + '</header>',
        '<h1>QUOTATION</h1>',
        '<dl class="quote-meta">',
        '<dt>QUOTE NO:</dt><dd>' + escapeHtml(doc.documentNumber) + '</dd>',
        '<dt>DATE:</dt><dd>' + formatDate(doc.issueDate) + '</dd>',
        '<dt>TITLE:</dt><dd>' + escapeHtml(doc.projectTitle || '-') + '</dd>',
        '</dl>',
        '<table class="quote-table"><thead><tr><th>DESCRIPTION</th><th>QTY</th><th>PRICE</th><th>TOTAL</th></tr></thead><tbody>',
        items.map(function(item, index) {
          var description = [
            index === 0 ? '<strong>SUMMARY:</strong><br><strong>' + escapeHtml(doc.projectTitle || item.description) + '</strong><br><br>' : '',
            escapeHtml(item.category || item.room || item.description),
            item.description && item.description !== item.category ? '<br><span>' + escapeHtml(item.description) + '</span>' : ''
          ].join('');
          return '<tr><td>' + description + '</td><td>' + escapeHtml(item.quantity) + '</td><td>' + money(item.unitPrice, doc.currency) + '</td><td>' + money(item.amount, doc.currency) + '</td></tr>';
        }).join(''),
        '</tbody></table>',
        '<div class="quote-totals">',
        totalRow('SUB TOTAL', money(doc.subtotal, doc.currency)),
        doc.discount ? totalRow('DISCOUNT', money(doc.discount, doc.currency)) : '',
        doc.tax ? totalRow('VAT', money(doc.tax, doc.currency) + ' (' + doc.taxRate + '%)') : '',
        totalRow('GRAND TOTAL', money(doc.total, doc.currency), true),
        '</div>',
        '</section>',
        '</main>'
      ].join('');
    }

    function renderInvoicePrint(doc) {
      var items = doc.items || [];
      var paid = String(doc.status || '').toLowerCase() === 'paid' ? Number(doc.total || 0) : 0;
      var balance = Math.max(0, Number(doc.total || 0) - paid);
      var denseClass = items.length > 8 ? ' print-dense' : '';

      return [
        '<main class="print-page invoice-print' + denseClass + '">',
        '<div class="invoice-band"></div>',
        '<header class="invoice-head">',
        printLogo('invoice-logo'),
        '<section><strong>INVOICE ' + escapeHtml(doc.documentNumber) + '</strong><span>' + escapeHtml(doc.documentNumber) + '</span><span>' + escapeHtml(COMPANY.legalName) + '</span><span>Vat Number: ' + escapeHtml(COMPANY.vatNumber) + '</span></section>',
        '<section class="invoice-company">' + companyAddressBlock(true) + '</section>',
        '</header>',
        '<section class="invoice-info">',
        '<div><strong>BILL TO</strong><p>' + escapeHtml(doc.clientName || '-') + '</p><p>' + escapeHtml(doc.projectTitle || '') + '</p></div>',
        '<div><strong>INVOICE DETAILS</strong><p><b>INVOICE DATE:</b> ' + formatDate(doc.issueDate) + '</p><p><b>INVOICE DUE:</b> ' + (doc.dueDate ? formatDate(doc.dueDate) : 'Due on Receipt') + '</p><p><b>BALANCE DUE:</b> ' + money(balance, doc.currency) + '</p></div>',
        '</section>',
        '<table class="invoice-table"><thead><tr><th>Description</th><th>Amount</th></tr></thead><tbody>',
        items.map(function(item) {
          var label = escapeHtml(item.description || item.category || item.room || 'Item');
          return '<tr><td>' + label + '</td><td>' + money(item.amount, doc.currency) + '</td></tr>';
        }).join(''),
        '</tbody></table>',
        '<div class="invoice-totals">',
        totalRow('SUB TOTAL', money(doc.subtotal, doc.currency)),
        doc.tax ? totalRow('VAT(' + doc.taxRate + '%)', money(doc.tax, doc.currency)) : '',
        totalRow('TOTAL', money(doc.total, doc.currency)),
        totalRow('PAID', money(paid, doc.currency)),
        totalRow('BALANCE DUE', money(balance, doc.currency), true),
        '</div>',
        '<section class="invoice-notes"><strong>NOTES</strong><p>' + escapeHtml(doc.notes || '') + '</p></section>',
        '<section class="signatures"><div><span></span><p>Signature & Date</p><p>For : Swish Innovation</p></div><div><span></span><p>Signature & Date</p><p>For: Client</p></div></section>',
        '<div class="invoice-footer-band"></div>',
        '</main>'
      ].join('');
    }

    function printLogo(className) {
      return COMPANY.logo
        ? '<img class="' + className + '" src="' + COMPANY.logo + '" alt="Swish Innovation">'
        : '<div class="' + className + ' logo-fallback">SI</div>';
    }

    function companyAddressBlock(compact) {
      var parts = [
        '<strong>' + escapeHtml(COMPANY.name) + '</strong>',
        COMPANY.addressLines.map(escapeHtml).join('<br>'),
        (compact ? 'P ' : '') + escapeHtml(COMPANY.phone),
        (compact ? 'M ' : '') + escapeHtml(COMPANY.mobile),
        escapeHtml(COMPANY.email),
        compact ? escapeHtml(COMPANY.website) : '',
        compact ? COMPANY.socials.map(escapeHtml).join('<br>') : ''
      ].filter(Boolean);
      return parts.map(function(part) {
        return '<span>' + part + '</span>';
      }).join('');
    }

    function printStyles() {
      return [
        '@page{size:A4 portrait;margin:10mm}',
        '#swishPrintMount{display:none}',
        '#swishPrintMount,#swishPrintMount *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}',
        '#swishPrintMount{background:#fff;color:#080a0b;font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:1.25;letter-spacing:0}',
        '.print-page{width:190mm;height:277mm;margin:0 auto;background:#fff;position:relative;overflow:hidden}',
        '.quote-print{display:grid;grid-template-columns:43mm 1fr;padding:0}',
        '.quote-rail{background:#000;color:#fff;height:277mm;padding:9mm 3mm 5mm;display:flex;flex-direction:column}',
        '.quote-logo{width:29mm;height:29mm;object-fit:cover;margin:0 auto 36mm}',
        '.quote-rail-section{display:grid;gap:2.4mm;margin-bottom:22mm}',
        '.quote-rail-section.bill{min-height:47mm}',
        '.quote-rail-section.payment{margin-bottom:10mm}',
        '.quote-rail-section h2{font-size:10px;line-height:1;margin:0;color:#fff;font-weight:800}',
        '.quote-rail-section span,.quote-rail-section strong{display:block;color:#a8a8a8;font-weight:400;word-break:break-word}',
        '.quote-socials{margin-top:auto;color:#8d8d8d;font-size:7.5px;line-height:1.4}',
        '.quote-sheet{height:277mm;padding:6mm 0 7mm 7mm;position:relative}',
        '.quote-company{display:grid;gap:.8mm;margin:0 0 20mm}',
        '.quote-company span{display:block}',
        '.quote-company strong{font-weight:500}',
        '.quote-sheet h1{font-size:31px;line-height:1;margin:0 0 22mm;font-weight:900}',
        '.quote-meta{display:grid;grid-template-columns:29mm 1fr;gap:6.5mm 15mm;margin:0 0 12mm}',
        '.quote-meta dt{font-weight:900}',
        '.quote-meta dd{margin:0;max-width:102mm;text-transform:uppercase}',
        '.quote-table,.invoice-table{width:100%;border-collapse:collapse;table-layout:fixed}',
        '.quote-table th{font-size:9.5px;text-align:left;border-bottom:2px solid #000;padding:0 0 1.5mm;font-weight:900}',
        '.quote-table th:nth-child(1){width:62%}.quote-table th:nth-child(2){width:9%}.quote-table th:nth-child(3){width:14%}.quote-table th:nth-child(4){width:15%}',
        '.quote-table th:nth-child(n+2),.quote-table td:nth-child(n+2){text-align:right}',
        '.quote-table td{height:10.5mm;border-bottom:1px solid #737373;padding:2mm 0 1.6mm;vertical-align:top}',
        '.quote-table strong{font-weight:900}.quote-table span{font-size:8.5px;color:#333}',
        '.quote-totals{position:absolute;right:0;bottom:11mm;width:43mm;font-size:9px}',
        '.total-row{display:flex;justify-content:space-between;gap:5mm;margin:1.4mm 0;white-space:nowrap}',
        '.total-row.grand{border-top:2px solid #000;padding-top:1.4mm;font-weight:900}',
        '.invoice-print{padding:0}',
        '.invoice-band,.invoice-footer-band{height:3mm;background:#69a6df}',
        '.invoice-head{display:grid;grid-template-columns:20mm 1fr 56mm;gap:8mm;padding:5mm 26mm 11mm;background:#f1f1f1}',
        '.invoice-logo{width:18mm;height:18mm;object-fit:cover}',
        '.invoice-head section{display:grid;align-content:start;gap:.8mm}.invoice-head strong{font-weight:500}.invoice-company{text-align:left}',
        '.invoice-info{display:grid;grid-template-columns:1fr 57mm;gap:18mm;padding:10mm 26mm 10mm}',
        '.invoice-info strong{font-size:10px}.invoice-info p{margin:1.6mm 0}',
        '.invoice-table thead{background:#6d99e8;color:#fff}',
        '.invoice-table th{font-weight:400;text-align:left;padding:2mm 26mm}.invoice-table th:last-child,.invoice-table td:last-child{text-align:right}',
        '.invoice-table td{padding:3mm 26mm;vertical-align:top}.invoice-table td:first-child{width:72%}',
        '.invoice-totals{width:56mm;margin:8mm 26mm 0 auto;font-weight:700}',
        '.invoice-notes{margin:14mm 26mm 0}.invoice-notes p{min-height:12mm;margin:3mm 0 0}',
        '.signatures{display:grid;grid-template-columns:1fr 1fr;gap:33mm;margin:12mm 26mm 16mm}',
        '.signatures span{display:block;height:10mm;border-bottom:1px solid transparent}.signatures p{margin:1mm 0}',
        '.invoice-footer-band{position:absolute;left:26mm;right:26mm;bottom:8mm;background:linear-gradient(90deg,#69a6df 0 17%,#6d99e8 17% 100%)}',
        '.print-dense{font-size:8.8px}.print-dense .quote-table td{height:8.7mm;padding:1.4mm 0}.print-dense .quote-sheet h1{margin-bottom:16mm}.print-dense .quote-meta{margin-bottom:9mm}.print-dense .invoice-table td{padding-top:2mm;padding-bottom:2mm}',
        '@media screen{#swishPrintMount{position:fixed;inset:0;z-index:-1;opacity:0;pointer-events:none}}',
        '@media print{html,body{width:210mm;min-height:297mm}body.swish-printing > :not(#swishPrintMount){display:none!important}body.swish-printing{background:#fff!important;margin:0!important}body.swish-printing #swishPrintMount{display:block!important;width:190mm;margin:0}.print-page{box-shadow:none;margin:0;break-after:page;page-break-after:always}.print-page:last-child{break-after:auto;page-break-after:auto}}'
      ].join('');
    }

    function detail(label, value, span, raw) {
      return '<div class="field ' + span + '"><label>' + label + '</label><div>' + (raw ? value : escapeHtml(value)) + '</div></div>';
    }

    function renderUsers() {
      if (state.user.role !== 'manager') return emptyState('Manager access is required.');
      if (!state.userForm) state.userForm = defaultUser();

      return [
        '<div class="insight-grid">',
        '<section class="panel">',
        '<div class="panel-header"><h2 class="panel-title">' + (state.userForm.id ? 'Edit user' : 'Create user') + '</h2><button type="button" class="icon-button" title="New user" data-action="new-user"><i data-lucide="user-plus"></i></button></div>',
        '<div class="panel-body">',
        '<form data-form="user" class="stack-list">',
        '<input type="hidden" name="id" value="' + escapeAttr(state.userForm.id || '') + '">',
        '<div class="form-grid">',
        field('Name', 'name', state.userForm.name, 'text', 'span-6', true),
        field('Email', 'email', state.userForm.email, 'email', 'span-6', true),
        selectField('Role', 'role', state.userForm.role || 'user', ['user', 'manager'], 'span-6'),
        selectField('Status', 'status', state.userForm.status || 'active', ['active', 'inactive'], 'span-6'),
        field(state.userForm.id ? 'New password' : 'Password', 'password', '', 'password', 'span-12', !state.userForm.id),
        '</div>',
        '<button type="submit" class="primary-button"><i data-lucide="save"></i><span>Save user</span></button>',
        '</form>',
        '</div>',
        '</section>',
        '<section class="panel">',
        '<div class="panel-header"><h2 class="panel-title">Team</h2><button type="button" class="icon-button" title="Refresh" data-action="refresh-users"><i data-lucide="refresh-cw"></i></button></div>',
        '<div class="panel-body">' + renderUserTable() + '</div>',
        '</section>',
        '</div>'
      ].join('');
    }

    function renderUserTable() {
      if (!state.users.length) return emptyState('No users yet.');
      return [
        '<div class="table-scroll"><table class="data-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr></thead><tbody>',
        state.users.map(function(user) {
          return [
            '<tr>',
            '<td><strong>' + escapeHtml(user.name) + '</strong></td>',
            '<td>' + escapeHtml(user.email) + '</td>',
            '<td><span class="chip">' + titleCase(user.role) + '</span></td>',
            '<td><span class="chip ' + escapeAttr(user.status) + '">' + titleCase(user.status) + '</span></td>',
            '<td><button type="button" class="icon-button" title="Edit" data-action="edit-user" data-id="' + escapeAttr(user.id) + '"><i data-lucide="pencil"></i></button></td>',
            '</tr>'
          ].join('');
        }).join(''),
        '</tbody></table></div>'
      ].join('');
    }

    function emptyState(text) {
      return '<div class="empty-state"><i data-lucide="inbox"></i><div>' + escapeHtml(text) + '</div></div>';
    }

    function renderToast() {
      return '<div class="toast ' + escapeAttr(state.toast.type || '') + '">' + escapeHtml(state.toast.message) + '</div>';
    }

    function statusChip(status) {
      return '<span class="chip ' + escapeAttr(String(status || '').toLowerCase().replace(/\s+/g, '-')) + '">' + escapeHtml(status || 'Draft') + '</span>';
    }

    function totalRow(label, value, grand) {
      return '<div class="total-row ' + (grand ? 'grand' : '') + '"><span>' + label + '</span><strong class="amount">' + value + '</strong></div>';
    }

    function defaultDocument(type) {
      return {
        type: type || 'quotation',
        status: 'Draft',
        clientName: '',
        clientEmail: '',
        clientPhone: '',
        clientAddress: '',
        projectTitle: '',
        projectAddress: '',
        issueDate: todayInput(),
        dueDate: todayInput(),
        discount: 0,
        taxRate: 0,
        currency: 'NGN',
        notes: '',
        terms: '',
        items: [blankItem()]
      };
    }

    function blankItem() {
      return {
        lineId: 'tmp_' + Date.now() + '_' + Math.round(Math.random() * 9999),
        category: '',
        room: '',
        description: '',
        quantity: 1,
        unit: 'item',
        unitPrice: 0
      };
    }

    function defaultUser() {
      return { name: '', email: '', role: 'user', status: 'active', password: '' };
    }

    function docToForm(doc, targetType) {
      var copy = JSON.parse(JSON.stringify(doc));
      if (targetType) {
        delete copy.id;
        delete copy.documentNumber;
        copy.type = targetType;
        copy.status = 'Draft';
        copy.convertedFrom = doc.id;
      }
      copy.items = (copy.items && copy.items.length ? copy.items : [blankItem()]).map(function(item) {
        item.lineId = item.lineId || blankItem().lineId;
        return item;
      });
      return copy;
    }

    function emptyDashboard() {
      return {
        cards: {
          quotationCount: 0,
          quotationValue: 0,
          invoiceCount: 0,
          invoiceValue: 0,
          paidValue: 0,
          outstandingValue: 0,
          conversionRate: 0
        },
        monthlyRevenue: [],
        statusBreakdown: [],
        topClients: [],
        recentDocuments: []
      };
    }

    function readDocumentForm() {
      var form = document.getElementById('documentForm');
      if (!form) return state.form || defaultDocument('quotation');
      var data = new FormData(form);
      var payload = {
        id: data.get('id') || '',
        type: data.get('type') || 'quotation',
        status: data.get('status') || 'Draft',
        clientName: data.get('clientName') || '',
        clientEmail: data.get('clientEmail') || '',
        clientPhone: data.get('clientPhone') || '',
        clientAddress: data.get('clientAddress') || '',
        projectTitle: data.get('projectTitle') || '',
        projectAddress: data.get('projectAddress') || '',
        issueDate: data.get('issueDate') || '',
        dueDate: data.get('dueDate') || '',
        discount: Number(data.get('discount') || 0),
        taxRate: Number(data.get('taxRate') || 0),
        currency: data.get('currency') || 'NGN',
        notes: data.get('notes') || '',
        terms: data.get('terms') || '',
        convertedFrom: data.get('convertedFrom') || '',
        items: []
      };

      form.querySelectorAll('tbody tr[data-line-index]').forEach(function(row) {
        var item = {};
        row.querySelectorAll('[data-item-field]').forEach(function(input) {
          item[input.dataset.itemField] = input.type === 'number' ? Number(input.value || 0) : input.value;
        });
        if (state.form && state.form.items && state.form.items[Number(row.dataset.lineIndex)]) {
          item.lineId = state.form.items[Number(row.dataset.lineIndex)].lineId;
        }
        payload.items.push(item);
      });

      return payload;
    }

    function syncDocumentForm() {
      state.form = readDocumentForm();
    }

    function refreshTotalsPreview() {
      var form = document.getElementById('documentForm');
      var preview = document.getElementById('totalsPreview');
      if (!form || !preview) return;

      var data = readDocumentForm();
      var subtotal = 0;
      form.querySelectorAll('tbody tr[data-line-index]').forEach(function(row) {
        var qty = Number(row.querySelector('[data-item-field="quantity"]').value || 0);
        var rate = Number(row.querySelector('[data-item-field="unitPrice"]').value || 0);
        var amount = qty * rate;
        subtotal += amount;
        var amountCell = row.querySelector('[data-line-amount]');
        if (amountCell) amountCell.textContent = money(amount, data.currency);
      });

      var discount = Math.min(Number(data.discount || 0), subtotal);
      var taxable = Math.max(0, subtotal - discount);
      var tax = taxable * Number(data.taxRate || 0) / 100;
      var total = taxable + tax;

      preview.innerHTML = [
        totalRow('Subtotal', money(subtotal, data.currency)),
        totalRow('Discount', money(discount, data.currency)),
        totalRow('Tax', money(tax, data.currency) + ' (' + Number(data.taxRate || 0) + '%)'),
        totalRow('Total', money(total, data.currency), true)
      ].join('');
    }

    document.addEventListener('submit', function(event) {
      var form = event.target.closest('form[data-form]');
      if (!form) return;
      event.preventDefault();

      if (form.dataset.form === 'login') {
        var loginData = new FormData(form);
        state.loading = true;
        api('login', loginData.get('email'), loginData.get('password'))
          .then(function(result) {
            state.token = result.token;
            state.user = result.user;
            state.dashboard = result.dashboard;
            localStorage.setItem('isd_token', state.token);
            state.loading = false;
            setToast('Signed in.');
            render();
          })
          .catch(handleError);
      }

      if (form.dataset.form === 'document') {
        syncDocumentForm();
        state.loading = true;
        api('saveDocument', state.token, state.form)
          .then(function(doc) {
            state.loading = false;
            setToast(doc.documentNumber + ' saved.');
            state.form = defaultDocument(doc.type);
            state.route = doc.type === 'invoice' ? 'invoices' : 'quotations';
            return loadDocuments(doc.type);
          })
          .catch(handleError);
      }

      if (form.dataset.form === 'filter') {
        var type = form.dataset.type;
        var filterData = new FormData(form);
        state.filters[type] = {
          search: filterData.get('search') || '',
          status: filterData.get('status') || ''
        };
        loadDocuments(type);
      }

      if (form.dataset.form === 'user') {
        var userData = new FormData(form);
        var payload = {
          id: userData.get('id') || '',
          name: userData.get('name') || '',
          email: userData.get('email') || '',
          role: userData.get('role') || 'user',
          status: userData.get('status') || 'active',
          password: userData.get('password') || ''
        };
        api('saveUser', state.token, payload)
          .then(function() {
            setToast('User saved.');
            state.userForm = defaultUser();
            return loadUsers();
          })
          .catch(handleError);
      }
    });

    document.addEventListener('click', function(event) {
      var trigger = event.target.closest('[data-action]');
      if (!trigger) return;
      var action = trigger.dataset.action;

      if (action === 'nav') {
        navigate(trigger.dataset.route);
      }

      if (action === 'toggle-menu') {
        state.mobileOpen = !state.mobileOpen;
        render();
      }

      if (action === 'logout') {
        api('logout', state.token).finally(function() {
          localStorage.removeItem('isd_token');
          state.token = '';
          state.user = null;
          state.dashboard = null;
          state.form = null;
          setToast('Signed out.');
          render();
        });
      }

      if (action === 'new-doc') {
        state.form = defaultDocument(trigger.dataset.type || 'quotation');
        state.route = 'create';
        state.mobileOpen = false;
        render();
      }

      if (action === 'switch-type') {
        syncDocumentForm();
        var type = trigger.dataset.type;
        state.form.type = type;
        state.form.status = 'Draft';
        state.form.dueDate = state.form.dueDate || todayInput();
        render();
      }

      if (action === 'add-line') {
        syncDocumentForm();
        state.form.items.push(blankItem());
        render();
      }

      if (action === 'remove-line') {
        syncDocumentForm();
        state.form.items.splice(Number(trigger.dataset.index), 1);
        if (!state.form.items.length) state.form.items.push(blankItem());
        render();
      }

      if (action === 'refresh-dashboard') {
        loadDashboard();
      }

      if (action === 'refresh-docs') {
        loadDocuments(trigger.dataset.type);
      }

      if (action === 'view-doc') {
        loadDocument(trigger.dataset.id, false);
      }

      if (action === 'edit-doc') {
        loadDocument(trigger.dataset.id, true);
      }

      if (action === 'convert-doc') {
        loadDocument(trigger.dataset.id, 'invoice');
      }

      if (action === 'delete-doc') {
        var id = trigger.dataset.id;
        if (!confirm('Delete this document?')) return;
        api('deleteDocument', state.token, id)
          .then(function() {
            setToast('Document deleted.');
            state.viewDocument = null;
            return Promise.all([loadDocuments('quotation', true), loadDocuments('invoice', true), loadDashboard(true)]);
          })
          .then(render)
          .catch(handleError);
      }

      if (action === 'print-doc') {
        if (state.viewDocument) printDocument(state.viewDocument);
      }

      if (action === 'close-modal') {
        if (trigger.classList.contains('modal-backdrop') && event.target !== trigger) return;
        state.viewDocument = null;
        render();
      }

      if (action === 'refresh-users') {
        loadUsers();
      }

      if (action === 'new-user') {
        state.userForm = defaultUser();
        render();
      }

      if (action === 'edit-user') {
        var user = state.users.filter(function(row) { return row.id === trigger.dataset.id; })[0];
        if (user) {
          state.userForm = JSON.parse(JSON.stringify(user));
          render();
        }
      }
    });

    document.addEventListener('input', function(event) {
      if (event.target.closest('#documentForm')) {
        refreshTotalsPreview();
      }
    });

    function navigate(route) {
      state.route = route;
      state.mobileOpen = false;
      if (route === 'dashboard') loadDashboard();
      if (route === 'quotations') loadDocuments('quotation');
      if (route === 'invoices') loadDocuments('invoice');
      if (route === 'users') loadUsers();
      render();
    }

    function loadDashboard(silent) {
      if (!silent) state.loading = true;
      return api('getDashboard', state.token)
        .then(function(dashboard) {
          state.dashboard = dashboard;
          state.loading = false;
          render();
        })
        .catch(handleError);
    }

    function loadDocuments(type, silent) {
      if (!silent) state.loading = true;
      return api('listDocuments', state.token, type, state.filters[type] || {})
        .then(function(result) {
          state.documents[type] = result.documents || [];
          state.loading = false;
          render();
        })
        .catch(handleError);
    }

    function loadDocument(id, mode) {
      return api('getDocument', state.token, id)
        .then(function(doc) {
          if (mode === true) {
            state.form = docToForm(doc);
            state.viewDocument = null;
            state.route = 'create';
          } else if (mode === 'invoice') {
            state.form = docToForm(doc, 'invoice');
            state.viewDocument = null;
            state.route = 'create';
          } else {
            state.viewDocument = doc;
          }
          render();
        })
        .catch(handleError);
    }

    function loadUsers() {
      return api('listUsers', state.token)
        .then(function(users) {
          state.users = users || [];
          render();
        })
        .catch(handleError);
    }

    function handleError(error) {
      state.loading = false;
      setToast(error.message || String(error), 'error');
      render();
    }

    function setToast(message, type) {
      state.toast = { message: message, type: type || '' };
      window.clearTimeout(state.toastTimer);
      state.toastTimer = window.setTimeout(function() {
        state.toast = null;
        render();
      }, 4200);
    }

    function money(value, currency) {
      try {
        return new Intl.NumberFormat('en-NG', {
          style: 'currency',
          currency: currency || 'NGN',
          maximumFractionDigits: 2
        }).format(Number(value) || 0);
      } catch (error) {
        return (currency || 'NGN') + ' ' + (Number(value) || 0).toLocaleString();
      }
    }

    function moneyCompact(value, currency) {
      try {
        return new Intl.NumberFormat('en-NG', {
          style: 'currency',
          currency: currency || 'NGN',
          notation: 'compact',
          maximumFractionDigits: 1
        }).format(Number(value) || 0);
      } catch (error) {
        return money(value, currency);
      }
    }

    function formatDate(value) {
      if (!value) return '-';
      var date = new Date(value);
      if (isNaN(date.getTime())) return escapeHtml(value);
      return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
    }

    function todayInput() {
      var date = new Date();
      date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
      return date.toISOString().slice(0, 10);
    }

    function titleCase(value) {
      return String(value || '').replace(/[-_]/g, ' ').replace(/\w\S*/g, function(text) {
        return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
      });
    }

    function escapeHtml(value) {
      return String(value === undefined || value === null ? '' : value).replace(/[&<>"']/g, function(char) {
        return {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;'
        }[char];
      });
    }

    function escapeAttr(value) {
      return escapeHtml(value).replace(/`/g, '&#96;');
    }

    function refreshIcons() {
      if (window.lucide) {
        window.lucide.createIcons({ attrs: { width: 18, height: 18, strokeWidth: 2 } });
      }
    }

    init();
  })();
