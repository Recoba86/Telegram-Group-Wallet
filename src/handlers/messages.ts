// Persian message templates
export const messages = {
  welcome: (firstName: string, referralCode: string, baseUrl: string) => `
سلام ${firstName} عزیز! 👋

به ربات کیف پول TON ما خوش اومدی! �

🔹 موجودی خودت رو چک کن
🔹 کدای هدیه رو استفاده کن
🔹 برداشت آسان به شبکه TON
🔹 دوستاتو دعوت کن و جایزه بگیر

دستورات:
/balance - مشاهده موجودی
/claim - استفاده از کد هدیه
/withdraw - برداشت به TON
/history - تاریخچه تراکنش‌ها
/referral - لینک دعوت و پاداش

🎁 کد معرفی شما: <code>${referralCode}</code>
🔗 لینک دعوت: ${baseUrl}/ref/${referralCode}

💎 این ربات فقط از شبکه TON پشتیبانی می‌کند

برای مدیریت حساب، از پنل ادمین استفاده کنید:
${baseUrl}/admin
  `.trim(),

  balance: (balance: number, referralCode: string) => `
💰 <b>موجودی شما</b>

💵 مقدار: ${balance.toFixed(2)}$

🎁 کد معرفی: <code>${referralCode}</code>

برای شارژ حساب از کدای هدیه استفاده کن (/claim)
برای برداشت از دستور /withdraw استفاده کن
  `.trim(),

  balanceWithTransactions: (balance: number, transactions: any[]) => {
    let msg = `💰 <b>موجودی: ${balance.toFixed(2)}$</b>\n\n📊 <b>آخرین تراکنش‌ها:</b>\n\n`;
    
    if (transactions.length === 0) {
      msg += 'هنوز تراکنشی نداشتی!';
    } else {
      transactions.forEach((tx: any) => {
        const type = tx.type === 'credit' || tx.type === 'redeem' || tx.type === 'referral_bonus' ? '➕' : '➖';
        const amount = parseFloat(tx.amount);
        const date = new Date(tx.created_at).toLocaleDateString('fa-IR');
        msg += `${type} ${amount.toFixed(2)}$ | ${date}\n`;
      });
    }
    
    return msg;
  },

  claimPrompt: () => `
🎟 <b>استفاده از کد هدیه</b>

کد رو به این صورت وارد کن:
/claim YOUR-CODE-HERE

مثال:
/claim GIFT-ABC123
  `.trim(),

  claimSuccess: (amount: number, newBalance: number) => `
✅ <b>کد با موفقیت استفاده شد!</b>

💰 مبلغ: ${amount.toFixed(2)}$
💵 موجودی جدید: ${newBalance.toFixed(2)}$
  `.trim(),

  claimError: (reason: string) => reason,

  withdrawPrompt: () => `
💸 <b>برداشت وجه</b>

برای برداشت TON، دستور زیر را ارسال کنید:
/withdraw AMOUNT TON_ADDRESS

مثال:
/withdraw 10.50 UQBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

⚠️ توجه: فقط شبکه TON پشتیبانی می‌شود
🔹 آدرس باید 48 کاراکتر یا بیشتر باشد
  `.trim(),

  withdrawFeeInfo: (amount: number, fee: number, netAmount: number) => `
💸 <b>اطلاعات برداشت</b>

💰 مبلغ درخواستی: ${amount.toFixed(2)}$
💸 کارمزد: ${fee.toFixed(2)}$
✅ مبلغ دریافتی: ${netAmount.toFixed(2)}$

برای تایید، اطلاعات کیف پول خود را وارد کنید.
  `.trim(),

  withdrawSuccess: (requestId: number, amount: number, fee: number) => `
📝 <b>درخواست برداشت ثبت شد!</b>

🆔 شناسه: #${requestId}
💰 مبلغ: ${amount.toFixed(2)}$
💸 کارمزد: ${fee.toFixed(2)}$
✅ دریافتی: ${(amount - fee).toFixed(2)}$

⏳ درخواست شما در صف بررسی قرار گرفت.
به محض تایید، به شما اطلاع داده می‌شود.
  `.trim(),

  withdrawError: (reason: string) => reason,

  referralInfo: (referralCode: string, baseUrl: string, totalReferrals: number, totalRewards: number, rewardAmount: number) => `
🎁 <b>برنامه دعوت از دوستان</b>

👥 دوستانی که دعوت کردی: ${totalReferrals}
💰 پاداش دریافتی: ${totalRewards.toFixed(2)}$

💎 پاداش هر دعوت: ${rewardAmount.toFixed(2)}$

🔗 <b>لینک دعوت شما:</b>
${baseUrl}/ref/${referralCode}

🎁 <b>کد معرفی:</b>
<code>${referralCode}</code>

این لینک رو با دوستات به اشتراک بذار و به ازای هر نفری که ثبت نام کنه ${rewardAmount}$ جایزه بگیر! 🎉
  `.trim(),

  history: (transactions: any[], page: number, totalPages: number) => {
    let msg = `📊 <b>تاریخچه تراکنش‌ها</b>\n\n`;
    
    if (transactions.length === 0) {
      msg += 'هنوز تراکنشی نداشتی!';
    } else {
      transactions.forEach((tx: any) => {
        const type = tx.type === 'credit' || tx.type === 'redeem' || tx.type === 'referral_bonus' ? '➕' : '➖';
        const amount = parseFloat(tx.amount);
        const balance = parseFloat(tx.balance_after);
        const date = new Date(tx.created_at).toLocaleDateString('fa-IR');
        const time = new Date(tx.created_at).toLocaleTimeString('fa-IR');
        
        msg += `${type} ${amount.toFixed(2)}$ | ${balance.toFixed(2)}$\n`;
        msg += `   ${date} ${time}\n\n`;
      });
      
      msg += `\n📄 صفحه ${page} از ${totalPages}`;
    }
    
    return msg;
  },

  membershipRequired: (channelId: string) => `
⚠️ <b>عضویت الزامی</b>

برای استفاده از این قابلیت، باید عضو کانال ما باشید.

لطفا ابتدا عضو شوید:
${channelId}

بعد از عضویت، دوباره امتحان کنید.
  `.trim(),

  error: () => `
❌ خطایی رخ داد!

لطفا دوباره امتحان کنید یا با پشتیبانی تماس بگیرید.
  `.trim(),

  notAuthorized: () => `
🚫 شما دسترسی به این دستور ندارید.
  `.trim(),

  rateLimitExceeded: () => `
⏰ تعداد درخواست‌های شما زیاد است!

لطفا چند دقیقه صبر کنید و دوباره امتحان کنید.
  `.trim(),
};
