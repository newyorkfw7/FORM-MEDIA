document.addEventListener('DOMContentLoaded', async function() {
  try {
    // Funcionalidad del Sidebar
    const toggleSidebarButton = document.getElementById('toggleSidebar');
    const sidebar = document.getElementById('sidebar');
    if (toggleSidebarButton && sidebar) {
      toggleSidebarButton.addEventListener('click', function() {
        sidebar.classList.toggle('closed');
      });
    }

    // Cargar datos de media
    const response = await fetch('/media');
    if (!response.ok) throw new Error('Failed to fetch media data');
    const mediaList = await response.json();

    const mediaListContainer = document.getElementById('mediaList');
    if (!mediaListContainer) throw new Error('Media list container not found');

    // Crear filtros
    const filtersContainer = document.createElement('div');
    filtersContainer.className = 'filters-container';

    // Filtro por 'Register Status'
    const registerStatusFilter = document.createElement('select');
    registerStatusFilter.innerHTML = `
      <option value="">All Register Status</option>
      <option value="REGISTER">REGISTER</option>
      <option value="No Register">No Register</option>
    `;
    filtersContainer.appendChild(registerStatusFilter);

    // Filtro por 'Type'
    const typeFilter = document.createElement('select');
    typeFilter.innerHTML = `
      <option value="">All Types</option>
      <option value="Photographer">Photographer</option>
      <option value="Videographer">Videographer</option>
    `;
    filtersContainer.appendChild(typeFilter);

    // Filtro por 'Email Status'
    const emailStatusFilter = document.createElement('select');
    emailStatusFilter.innerHTML = `
      <option value="">All Email Status</option>
      <option value="Sent">Sent</option>
      <option value="Pending">Pending</option>
      <option value="Error">Error</option>
    `;
    filtersContainer.appendChild(emailStatusFilter);

    // Filtro por 'Day'
    const dayFilter = document.createElement('select');
    dayFilter.innerHTML = '<option value="">All Days</option>';
    const days = [...new Set(mediaList.map(media => media.day))];
    days.forEach(day => {
      const option = document.createElement('option');
      option.value = day;
      option.textContent = day;
      dayFilter.appendChild(option);
    });
    filtersContainer.appendChild(dayFilter);

    // Filtro por 'Time'
    const timeFilter = document.createElement('select');
    timeFilter.innerHTML = '<option value="">All Times</option>';
    const times = [...new Set(mediaList.map(media => media.time))];
    times.forEach(time => {
      const option = document.createElement('option');
      option.value = time;
      option.textContent = time;
      timeFilter.appendChild(option);
    });
    filtersContainer.appendChild(timeFilter);

    mediaListContainer.insertBefore(filtersContainer, mediaListContainer.firstChild);

    // Crear la tabla
    const mediaTable = document.createElement('table');
    mediaTable.className = 'media-table';

    // Crear el encabezado de la tabla
    const headerRow = document.createElement('thead');
    const headerTitles = ['QR', 'Participation Number', 'Name', 'Email', 'Phone', 'Type', 'Instagram', 'Day', 'Time', 'Register Status', 'Send Mail', 'Email Status', 'View Details'];

    const headerRowContent = document.createElement('tr');
    headerTitles.forEach(title => {
      const th = document.createElement('th');
      th.textContent = title;
      headerRowContent.appendChild(th);
    });

    headerRow.appendChild(headerRowContent);
    mediaTable.appendChild(headerRow);

    // Función para manejar el clic en el QR
    const handleQRClick = function(qrImgUrl) {
      const modalImg = document.getElementById('modalImg');
      if (modalImg) {
        modalImg.src = qrImgUrl;
        const modal = document.getElementById('qrModal');
        if (modal) modal.style.display = 'block';
      }
    };

    // Función para enviar correo con PDF adjunto
    const sendEmail = async function(media, emailStatusCell) {
      try {
        const response = await fetch('/send-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: media.emailAddress,
            participationNumber: media.participationNumber,
            name: media.fullName,
            phone: media.phoneNumber,
            type: media.type,
            instagram: media.instagramUsername,
            status: media.status,
            day: media.day,
            time: media.time,
            mediaId: media._id
          })
        });
        if (response.ok) {
          emailStatusCell.textContent = 'Sent';
          emailStatusCell.style.color = 'green';
          await fetch(`/update-email-status/${media._id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ emailStatus: 'Sent' })
          });
        } else {
          emailStatusCell.textContent = 'Error';
          emailStatusCell.style.color = 'red';
          await fetch(`/update-email-status/${media._id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ emailStatus: 'Error' })
          });
        }
      } catch (error) {
        console.error('Error sending email:', error);
        emailStatusCell.textContent = 'Error';
        emailStatusCell.style.color = 'red';
      }
    };

    const createTableRow = function(media) {
      const mediaRow = document.createElement('tr');
    
      const qrCell = document.createElement('td');
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(`http://localhost:3000/mediaDetail.html?id=${media._id}`)}`;
      const qrImg = document.createElement('img');
      qrImg.src = qrUrl;
      qrImg.alt = 'QR Code';
      qrImg.className = 'qr-img';
      qrImg.addEventListener('click', () => handleQRClick(qrUrl));
      qrCell.appendChild(qrImg);
    
      const participationNumberCell = document.createElement('td');
      participationNumberCell.textContent = media.participationNumber;
    
      const nameCell = document.createElement('td');
      nameCell.textContent = media.fullName;
    
      const emailCell = document.createElement('td');
      emailCell.textContent = media.emailAddress;
    
      const phoneCell = document.createElement('td');
      phoneCell.textContent = media.phoneNumber;
    
      const typeCell = document.createElement('td');
      typeCell.textContent = media.type;
    
      const instagramCell = document.createElement('td');
      instagramCell.textContent = media.instagramUsername;
    
      const dayCell = document.createElement('td');
      dayCell.textContent = media.day;
    
      const timeCell = document.createElement('td');
      timeCell.textContent = media.time;
    
      const registerStatusCell = document.createElement('td');
      registerStatusCell.textContent = media.registerStatus || 'No Register';
      registerStatusCell.style.backgroundColor = media.registerStatus === 'REGISTER' ? 'green' : 'red';
      registerStatusCell.style.color = 'white';
    
      const sendEmailCell = document.createElement('td');
      const sendEmailButton = document.createElement('button');
      sendEmailButton.textContent = 'SEND MAIL';
      sendEmailButton.addEventListener('click', () => sendEmail(media, emailStatusCell));
      sendEmailCell.appendChild(sendEmailButton);
    
      const emailStatusCell = document.createElement('td');
      emailStatusCell.textContent = media.emailStatus || 'Pending';
    
      const viewDetailsCell = document.createElement('td');
      const viewDetailsButton = document.createElement('button');
      viewDetailsButton.textContent = 'View Details';
      viewDetailsButton.addEventListener('click', () => {
        window.location.href = `mediaDetail.html?id=${media._id}`;
      });
      viewDetailsCell.appendChild(viewDetailsButton);
    
      mediaRow.appendChild(qrCell);
      mediaRow.appendChild(participationNumberCell);
      mediaRow.appendChild(nameCell);
      mediaRow.appendChild(emailCell);
      mediaRow.appendChild(phoneCell);
      mediaRow.appendChild(typeCell);
      mediaRow.appendChild(instagramCell);
      mediaRow.appendChild(dayCell);
      mediaRow.appendChild(timeCell);
      mediaRow.appendChild(registerStatusCell);
      mediaRow.appendChild(sendEmailCell);
      mediaRow.appendChild(emailStatusCell);
      mediaRow.appendChild(viewDetailsCell);
    
      return mediaRow;
    };
    
    const tbody = document.createElement('tbody');
    mediaList.forEach(media => {
      const mediaRow = createTableRow(media);
      tbody.appendChild(mediaRow);
    });
    mediaTable.appendChild(tbody);

    mediaListContainer.appendChild(mediaTable);

    // Filtros de la tabla
    function filterTable() {
      const rows = mediaTable.querySelectorAll('tbody tr');
      rows.forEach(row => {
        const registerStatusMatch = row.cells[9].textContent.includes(registerStatusFilter.value);
        const typeMatch = row.cells[5].textContent.includes(typeFilter.value);
        const emailStatusMatch = row.cells[11].textContent.includes(emailStatusFilter.value);
        const dayMatch = row.cells[7].textContent.includes(dayFilter.value);
        const timeMatch = row.cells[8].textContent.includes(timeFilter.value);

        if (registerStatusMatch && typeMatch && emailStatusMatch && dayMatch && timeMatch) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      });
    }

    [registerStatusFilter, typeFilter, emailStatusFilter, dayFilter, timeFilter].forEach(filter => {
      filter.addEventListener('change', filterTable);
    });

  } catch (error) {
    console.error('Error loading media list:', error);
  }
});

// Manejo del modal de QR
const modal = document.getElementById('qrModal');
const closeModal = document.getElementById('closeModal');
if (modal && closeModal) {
  closeModal.addEventListener('click', function() {
    modal.style.display = 'none';
  });
  window.addEventListener('click', function(event) {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  });
}
