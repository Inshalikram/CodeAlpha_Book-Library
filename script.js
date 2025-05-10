document.addEventListener('DOMContentLoaded', function () {
    let library = JSON.parse(localStorage.getItem('library')) || [];
    let borrowers = JSON.parse(localStorage.getItem('borrowers')) || [];

    const sections = {
        addBook: document.getElementById('addBookSection'),
        search: document.getElementById('searchSection'),
        borrow: document.getElementById('borrowSection'),
        inventory: document.getElementById('inventorySection')
    };

    const navButtons = {
        addBook: document.getElementById('showAddBook'),
        search: document.getElementById('showSearch'),
        borrow: document.getElementById('showBorrow'),
        inventory: document.getElementById('showInventory')
    };

    const addBookForm = document.getElementById('addBookForm');
    const searchInput = document.getElementById('searchInput');
    const searchCategory = document.getElementById('searchCategory');
    const searchButton = document.getElementById('searchButton');
    const resetSearch = document.getElementById('resetSearch');
    const searchResults = document.getElementById('searchResults');

    const bookToBorrowSelect = document.getElementById('bookToBorrow');
    const borrowerNameInput = document.getElementById('borrowerName');
    const borrowButton = document.getElementById('borrowButton');
    const borrowMessage = document.getElementById('borrowMessage');
    const borrowerToReturnInput = document.getElementById('borrowerToReturn');
    const borrowedBooksList = document.getElementById('borrowedBooksList');
    const returnMessage = document.getElementById('returnMessage');

    const inventoryCategory = document.getElementById('inventoryCategory');
    const inventoryStatus = document.getElementById('inventoryStatus');
    const filterInventory = document.getElementById('filterInventory');
    const inventoryList = document.getElementById('inventoryList');
    const inventoryStats = document.getElementById('inventoryStats');

    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    function showSection(name) {
        Object.values(sections).forEach(sec => sec.classList.remove('active-section'));
        sections[name].classList.add('active-section');

        if (name === 'search') performSearch();
        else if (name === 'borrow') updateBookToBorrowSelect();
        else if (name === 'inventory') updateInventory();
    }

    Object.entries(navButtons).forEach(([key, btn]) => {
        btn.addEventListener('click', () => showSection(key));
    });

    showSection('addBook');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');

            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            tabContents.forEach(content => content.classList.remove('active'));
            document.getElementById(tabId).classList.add('active');

            if (tabId === 'borrowTab') updateBookToBorrowSelect();
            else if (tabId === 'returnTab') {
                borrowedBooksList.innerHTML = '';
                returnMessage.textContent = '';
                returnMessage.className = 'message';
            }
        });
    });

    addBookForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const title = document.getElementById('title').value.trim();
        const author = document.getElementById('author').value.trim();
        const category = document.getElementById('category').value;
        const copies = parseInt(document.getElementById('copies').value);

        const existingBookIndex = library.findIndex(
            book => book.title.toLowerCase() === title.toLowerCase() &&
                    book.author.toLowerCase() === author.toLowerCase()
        );

        if (existingBookIndex !== -1) {
            library[existingBookIndex].totalCopies += copies;
            library[existingBookIndex].availableCopies += copies;
            showMessage('addBookMessage', `Added ${copies} more copies to "${title}"`, 'success');
        } else {
            const newBook = {
                id: Date.now().toString(),
                title,
                author,
                category,
                totalCopies: copies,
                availableCopies: copies,
                borrowedBy: []
            };
            library.push(newBook);
            showMessage('addBookMessage', `Added new book "${title}"`, 'success');
        }

        saveLibraryData();
        addBookForm.reset();
    });

    searchButton.addEventListener('click', performSearch);
    resetSearch.addEventListener('click', () => {
        searchInput.value = '';
        searchCategory.value = '';
        performSearch();
    });

    searchInput.addEventListener('keyup', e => {
        if (e.key === 'Enter') performSearch();
    });

    function performSearch() {
        const term = searchInput.value.trim().toLowerCase();
        const category = searchCategory.value;

        let results = library.filter(book =>
            (!term || book.title.toLowerCase().includes(term) || book.author.toLowerCase().includes(term)) &&
            (!category || book.category === category)
        );

        displayBooks(results, searchResults);
    }

    function updateBookToBorrowSelect() {
        bookToBorrowSelect.innerHTML = '<option value="">Select a book</option>';
        library.forEach(book => {
            if (book.availableCopies > 0) {
                const option = document.createElement('option');
                option.value = book.id;
                option.textContent = `${book.title} by ${book.author} (${book.availableCopies} available)`;
                bookToBorrowSelect.appendChild(option);
            }
        });
    }

    borrowButton.addEventListener('click', function () {
        const bookId = bookToBorrowSelect.value;
        const borrowerName = borrowerNameInput.value.trim();

        if (!bookId || !borrowerName) {
            showMessage('borrowMessage', 'Please select a book and enter your name', 'error');
            return;
        }

        const book = library.find(b => b.id === bookId);
        if (!book || book.availableCopies < 1) {
            showMessage('borrowMessage', 'Book not available', 'error');
            return;
        }

        book.availableCopies--;
        book.borrowedBy.push({ borrowerName, borrowDate: new Date().toISOString(), returnDate: null });

        let borrower = borrowers.find(b => b.name.toLowerCase() === borrowerName.toLowerCase());
        if (!borrower) {
            borrower = { name: borrowerName, borrowedBooks: [] };
            borrowers.push(borrower);
        }

        borrower.borrowedBooks.push({ bookId, borrowDate: new Date().toISOString(), returnDate: null });

        saveLibraryData();
        showMessage('borrowMessage', `Borrowed "${book.title}"`, 'success');
        borrowerNameInput.value = '';
        updateBookToBorrowSelect();
    });

    borrowerToReturnInput.addEventListener('input', function () {
        const name = this.value.trim().toLowerCase();
        if (name.length < 3) return borrowedBooksList.innerHTML = '';

        const borrower = borrowers.find(b =>
            b.name.toLowerCase().includes(name) &&
            b.borrowedBooks.some(book => !book.returnDate)
        );

        borrowedBooksList.innerHTML = '';

        if (!borrower) {
            borrowedBooksList.innerHTML = '<p class="message info">No active borrowed books</p>';
            return;
        }

        borrower.borrowedBooks.forEach(borrowedBook => {
            if (!borrowedBook.returnDate) {
                const book = library.find(b => b.id === borrowedBook.bookId);
                if (book) {
                    const div = document.createElement('div');
                    div.className = 'book-card';
                    div.innerHTML = `
                        <h3>${book.title}</h3>
                        <p><strong>Author:</strong> ${book.author}</p>
                        <p><strong>Borrowed on:</strong> ${new Date(borrowedBook.borrowDate).toLocaleDateString()}</p>
                        <button class="return-button" data-book-id="${book.id}" data-borrower-name="${borrower.name}">Return Book</button>
                    `;
                    borrowedBooksList.appendChild(div);
                }
            }
        });

        document.querySelectorAll('.return-button').forEach(btn => {
            btn.addEventListener('click', function () {
                returnBook(this.dataset.bookId, this.dataset.borrowerName);
            });
        });
    });

    function returnBook(bookId, borrowerName) {
        const book = library.find(b => b.id === bookId);
        const borrower = borrowers.find(b => b.name === borrowerName);
        if (!book || !borrower) {
            showMessage('returnMessage', 'Error returning book', 'error');
            return;
        }

        book.availableCopies++;
        const bookRecord = book.borrowedBy.find(r => r.borrowerName === borrowerName && !r.returnDate);
        const borrowerRecord = borrower.borrowedBooks.find(r => r.bookId === bookId && !r.returnDate);

        if (bookRecord) bookRecord.returnDate = new Date().toISOString();
        if (borrowerRecord) borrowerRecord.returnDate = new Date().toISOString();

        saveLibraryData();
       showMessage('returnMessage', `Returned "${book.title}"`, 'success');
    }
})

