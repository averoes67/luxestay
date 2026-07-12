const dictEn = require('./dict_en.json');
const fs = require('fs');

const dictJa = {
  "overview": "概要",
  "rooms": "客室",
  "reservations": "予約",
  "guests": "ゲスト",
  "revenue": "収益",
  "total_rooms": "総客室数",
  "available_rooms": "空室",
  "total_guests": "総ゲスト数",
  "today_s_revenue": "本日の収益",
  "recent_reservations": "最近の予約",
  "view_all": "すべて見る",
  "guest": "ゲスト",
  "room": "客室",
  "check_in": "チェックイン",
  "check_out": "チェックアウト",
  "status": "ステータス",
  "action": "アクション",
  "revenue_overview": "収益概要",
  "last_7_days": "過去7日間",
  "last_30_days": "過去30日間",
  "this_year": "今年",
  "manage_rooms": "客室管理",
  "type": "タイプ",
  "capacity": "定員",
  "base_price": "基本料金",
  "total_bookings": "総予約数",
  "total_revenue": "総収益",
  "current_price": "現在の料金",
  "new_price_per_night_idr_base_u": "1泊あたりの新料金 (IDRベース)",
  "cancel": "キャンセル",
  "save_price": "料金を保存",
  "home": "ホーム",
  "book_now": "今すぐ予約",
  "contact": "お問い合わせ",
  "sign_in": "ログイン",
  "register": "登録",
  "reserve_your_luxury_experience": "極上の体験を予約",
  "luxury": "ラグジュアリー",
  "complete_your_booking_in_just": "わずか数ステップで予約完了",
  "select_dates": "日付を選択",
  "choose_room": "客室を選ぶ",
  "guest_details": "ゲスト詳細",
  "payment": "お支払い",
  "confirmation": "確認",
  "select_your_dates": "日付の選択",
  "choose_your_check_in_and_check": "ご希望のチェックイン・チェックアウト日をお選びください。",
  "check_in_date": "チェックイン日",
  "check_out_date": "チェックアウト日",
  "number_of_guests": "宿泊人数",
  "search_available_rooms": "空室を検索",
  "choose_your_room": "客室の選択",
  "select_the_perfect_room_for_yo": "ご滞在に最適な客室をお選びください。",
  "searching_available_rooms": "空室を検索中...",
  "no_rooms_available_for_the_sel": "選択された日付では空室がありません。別の日付をお試しください。",
  "back": "戻る",
  "continue": "次へ",
  "tell_us_a_bit_about_yourself_a": "お客様の情報と特別なご要望をお知らせください。",
  "an_account_will_be_created_for": "アカウントは自動的に作成されます。",
  "already_have_an_account_sign_i": "すでにアカウントをお持ちですか？ ログインはこちら →",
  "sign_in_here": "ログインはこちら →",
  "full_name": "氏名 *",
  "email_address": "メールアドレス *",
  "phone_number": "電話番号",
  "create_password_for_your_accou": "パスワードを作成（アカウント用） *",
  "special_requests": "特別なご要望",
  "confirm_booking": "予約を確定",
  "payment_details": "お支払い詳細",
  "complete_your_reservation_secu": "安全に予約を完了してください。",
  "credit_card": "クレジットカード",
  "bank_transfer": "銀行振込",
  "e_wallet": "電子マネー",
  "cash": "現金",
  "pay_now": "今すぐ支払う",
  "booking_confirmed": "予約が完了しました！",
  "your_luxury_experience_has_bee": "極上の体験の予約と支払いが完了しました。",
  "go_to_dashboard": "ダッシュボードへ",
  "book_another_room": "別の部屋を予約",
  "experience_unparalleled_luxury": "すべての滞在で比類なき贅沢と世界クラスのおもてなしを。",
  "our_rooms": "客室紹介",
  "contact_us": "お問い合わせ",
  "dashboard": "ダッシュボード",
  "123_luxury_avenue": "123 ラグジュアリー・アベニュー",
  "info_luxestay_com": "info@luxestay.com",
  "_2026_luxestay_all_rights_rese": "© 2026 LuxeStay. 無断複写・転載を禁じます。",
  "welcome_back_guest": "おかえりなさい！",
  "manage_your_reservations_and_p": "予約を管理し、次の贅沢な休暇を計画しましょう。",
  "book_a_new_stay": "新しく予約する",
  "all_0": "すべて 0",
  "upcoming_0": "予定 0",
  "completed_0": "完了 0",
  "cancelled_0": "キャンセル 0",
  "no_reservations_found": "予約が見つかりません",
  "you_haven_t_made_any_bookings": "まだ予約がありません。極上の滞在の計画を始めましょう！",
  "browse_rooms": "客室を見る",
  "book_a_new_room_reserve_your_n": "新しい部屋を予約する\n次の極上の体験を予約",
  "book_a_new_room": "新しい客室を予約",
  "reserve_your_next_luxury_exper": "次の極上の体験を予約",
  "browse_rooms_explore_our_colle": "客室を見る\nプレミアムな客室のコレクションを探索",
  "explore_our_collection_of_prem": "プレミアムな客室のコレクションを探索",
  "cancel_reservation": "予約をキャンセル",
  "are_you_sure": "本当によろしいですか？",
  "this_action_cannot_be_undone_y": "この操作は元に戻せません。予約はキャンセルされます。",
  "keep_booking": "予約を保持",
  "leave_a_review": "レビューを書く",
  "rating": "評価",
  "your_experience": "あなたの体験",
  "submit_review": "レビューを送信",
  "amenities": "アメニティ",
  "login": "ログイン",
  "experience_true_luxury": "真の贅沢を体験",
  "where_elegancemeets_comfort": "優雅さと快適さの出会い",
  "immerse_yourself_in_unparallel": "比類なき洗練に浸る。美しくデザインされたスイートから世界クラスのアメニティまで、LuxeStayでのすべての瞬間は完璧に作られています。",
  "explore_rooms": "客室を探索",
  "virtual_tour": "バーチャルツアー",
  "search": "検索",
  "scroll": "スクロール",
  "accommodations": "宿泊施設",
  "our_finest_accommodations": "最高級の宿泊施設",
  "each_room_is_a_masterpiece_of": "各部屋はデザインの傑作であり、時代を超越した優雅さとモダンな快適さを融合させています。",
  "view_all_rooms": "すべての客室を見る",
  "services": "サービス",
  "world_class_amenities": "世界クラスのアメニティ",
  "indulge_in_an_array_of_premium": "ご滞在のあらゆる側面を向上させるために設計されたプレミアムサービスをご堪能ください。",
  "a_stunning_rooftop_infinity_po": "街のスカイラインを見渡す美しい屋上インフィニティプール。通年ご利用いただけます。",
  "rejuvenate_your_senses_with_ou": "受賞歴のあるスパで感覚をリフレッシュ。最高級のオーガニック製品を使用したオーダーメイドのトリートメントを提供します。",
  "savour_culinary_masterpieces_p": "エレガントなレストランや個室で、ミシュラン星獲得シェフが腕を振るう料理の傑作をご堪能ください。",
  "state_of_the_art_gym_equipped": "プレミアムマシン、パーソナルトレーナー、ヨガスタジオを備えた最新設備のジム。",
  "high_speed_fiber_internet_thro": "館内全域で高速光インターネットを完備し、仕事でもレジャーでもシームレスな接続を保証します。",
  "our_dedicated_concierge_team_i": "専属のコンシェルジュチームが24時間体制でご要望にお応えし、忘れられない体験をキュレートします。",
  "testimonials": "お客様の声",
  "what_our_guests_say": "ゲストの感想",
  "hear_from_our_guests_about_the": "LuxeStayでの忘れられない体験について、ゲストの声をお聞きください。",
  "ready_for_an_unforgettable_sta": "忘れられない滞在の準備はできましたか？",
  "book_your_luxury_experience_to": "今すぐ極上の体験を予約し、目の肥えた旅行者がLuxeStayを選ぶ理由を発見してください。",
  "book_your_stay": "宿泊を予約",
  "where_elegance_meets_comfort_e": "優雅さと快適さの出会い。街の中心部で世界クラスのおもてなしを。",
  "rooms_suites": "客室とスイート",
  "dining": "ダイニング",
  "spa_wellness": "スパとウェルネス",
  "42_royal_avenue_manhattan_ny_1": "42 Royal Avenue, Manhattan, NY 10001",
  "hello_luxestay_com": "hello@luxestay.com",
  "subscribe_for_exclusive_offers": "限定オファーや最新ニュースを購読する。",
  "privacy_policy": "プライバシーポリシー",
  "terms_of_service": "利用規約",
  "sitemap": "サイトマップ",
  "welcome_back_sign_in_to_manage": "おかえりなさい。サインインして予約を管理してください。",
  "email_address_233": "メールアドレス",
  "password": "パスワード",
  "forgot_password": "パスワードをお忘れですか？",
  "create_one": "アカウントを作成",
  "full_name_238": "氏名",
  "email_address_239": "メールアドレス",
  "confirm_password": "パスワードの確認",
  "create_account": "アカウントを作成",
  "sign_in_244": "ログイン",
  "our_rooms_suites": "客室とスイートのご案内",
  "suites": "スイート",
  "discover_your_perfect_retreat": "豪華な設備の客室とスイートから、完璧な隠れ家を見つけてください。",
  "price_range": "価格帯",
  "sort_by": "並べ替え",
  "showing_6_rooms": "6部屋を表示中",
  "all_prices_per_night": "すべての価格は1泊あたり",
  "check_availability": "空室状況を確認",
  "great_news_rooms_are_available": "朗報です — ご希望の日付で空室があります。",
  "where_elegance_meets_comfort_e_279": "優雅さと快適さの出会い。街の中心部で世界クラスのおもてなしを。",
  "subscribe_for_exclusive_offers_287": "限定オファーや最新ニュースを購読する。"
};

// Ensure all keys in dictEn exist in dictJa, otherwise fallback to EN
for (const key in dictEn) {
  if (!dictJa[key]) dictJa[key] = dictEn[key];
}

const jsContent = `
// Auto-generated i18n dictionaries
const i18nDict = {
  en: ${JSON.stringify(dictEn, null, 2)},
  ja: ${JSON.stringify(dictJa, null, 2)}
};

function changeLanguage(lang) {
  if (!i18nDict[lang]) lang = 'en';
  localStorage.setItem('luxestay_lang', lang);
  
  // Update UI dropdown if present
  const switcher = document.getElementById('langSwitcher');
  if (switcher && switcher.value !== lang) {
    switcher.value = lang;
  }
  
  // Translate all data-i18n elements
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (i18nDict[lang] && i18nDict[lang][key]) {
      // Simple text replacement, preserving inner HTML elements if possible?
      // Since we extracted text, we replace text.
      el.textContent = i18nDict[lang][key];
    }
  });
}

// Initialize on load
window.addEventListener('DOMContentLoaded', () => {
  const savedLang = localStorage.getItem('luxestay_lang') || 'en';
  if (savedLang !== 'en') {
    changeLanguage(savedLang);
  }
});
`;

fs.writeFileSync('js/i18n.js', jsContent);
console.log('js/i18n.js generated.');
