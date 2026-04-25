// Initialize Paddle Billing with the provided Client Token
function initializePaddle() {
    if (typeof Paddle !== 'undefined') {
        Paddle.Environment.set('production');
        Paddle.Initialize({
            token: 'live_f9b5222e2541f91c203b963de01'
        });
        console.log("Paddle initialized successfully.");
    } else {
        console.error("Paddle library is not loaded.");
    }
}

// Map plan names to their respective Paddle Price IDs
// NOTE: Please replace these placeholder price IDs with the actual Price IDs from your Paddle dashboard
const PADDLE_PRICE_IDS = {
    'Weekly Basic': 'pri_weekly_placeholder',
    'Monthly Pro': 'pri_monthly_placeholder',
    'Yearly Corporate': 'pri_yearly_placeholder'
};

// Open Paddle Checkout for a specific plan
function openPaddlePayment(planName) {
    const priceId = PADDLE_PRICE_IDS[planName];
    
    if (!priceId) {
        console.error(`No Paddle Price ID found for plan: ${planName}`);
        alert("Payment configuration for this plan is incomplete. Please ensure Paddle Price IDs are added to js/paddle.js");
        return;
    }

    if (typeof Paddle !== 'undefined') {
        Paddle.Checkout.open({
            items: [
                {
                    priceId: priceId,
                    quantity: 1
                }
            ]
        });
    } else {
        console.error("Paddle is not initialized");
        alert("Payment gateway could not be loaded. Please try again later.");
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    initializePaddle();
});
