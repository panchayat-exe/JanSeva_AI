document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const mobileInput = document.getElementById('mobileInput');
    
    // Allow only numeric input
    mobileInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
    });

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const mobileNumber = mobileInput.value;
        
        if (mobileNumber.length !== 10) {
            alert('Please enter a valid 10-digit mobile number.');
            return;
        }

        // Simulate sending OTP
        const btn = loginForm.querySelector('.primary-btn');
        const originalText = btn.innerHTML;
        
        btn.innerHTML = '<span class="material-symbols-rounded icon-sm">autorenew</span> Sending...';
        btn.style.opacity = '0.8';
        btn.disabled = true;

        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.opacity = '1';
            btn.disabled = false;
            alert(`OTP sent successfully to +91 ${mobileNumber}`);
        }, 1500);
    });
});
