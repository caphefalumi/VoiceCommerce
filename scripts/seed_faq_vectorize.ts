/**
 * seed_faq_vectorize.ts
 * Seeds TGDD FAQ entries into Cloudflare Vectorize index: tgdd-faq
 *
 * Usage:
 *   npx ts-node --esm scripts/seed_faq_vectorize.ts
 *   or: npx tsx scripts/seed_faq_vectorize.ts
 *
 * Requires env vars:
 *   CLOUDFLARE_ACCOUNT_ID
 *   CLOUDFLARE_API_TOKEN  (needs AI + Vectorize write permission)
 */

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!;
const API_TOKEN  = process.env.CLOUDFLARE_API_TOKEN!;
const INDEX_NAME = 'tgdd-faq';
const EMBED_MODEL = '@cf/baai/bge-m3';

// ─── TGDD FAQ DATA (crawled from thegioididong.com) ─────────────────────────
// Each entry: { id, topic, question, answer, keywords[] }
const faqEntries = [
  // ── ĐỔI TRẢ ────────────────────────────────────────────────────────────────
  {
    id: 'faq-doi-tra-1',
    topic: 'đổi trả',
    question: 'Chính sách đổi trả hàng của Thế Giới Di Động như thế nào?',
    answer: 'Thế Giới Di Động áp dụng chính sách "Hư gì đổi nấy ngay và luôn": Trong tháng đầu tiên, nếu sản phẩm (điện thoại, laptop, tablet, smartwatch) có lỗi nhà sản xuất, bạn được đổi miễn phí sản phẩm mới cùng loại.',
    keywords: ['đổi trả', 'đổi hàng', 'trả hàng', 'chính sách đổi trả', 'hư gì đổi nấy'],
  },
  {
    id: 'faq-doi-tra-2',
    topic: 'đổi trả',
    question: 'Nếu muốn trả hàng không do lỗi sản phẩm thì mất phí bao nhiêu?',
    answer: 'Nếu trả hàng không do lỗi sản phẩm trong tháng đầu tiên, phí thu lại là 20% giá trị trên hóa đơn. Các tháng tiếp theo phí tăng thêm 10%/tháng.',
    keywords: ['trả hàng', 'phí trả hàng', 'không lỗi', 'hoàn tiền', 'đổi trả'],
  },
  {
    id: 'faq-doi-tra-3',
    topic: 'đổi trả',
    question: 'Phụ kiện điện tử có được đổi trả không?',
    answer: 'Phụ kiện điện tử (sạc, cáp, tai nghe, pin dự phòng...) được bảo hành 1 đổi 1 trong 12 tháng nếu có lỗi nhà sản xuất.',
    keywords: ['phụ kiện', 'đổi trả phụ kiện', 'sạc', 'cáp', 'tai nghe', 'đổi 1 đổi 1'],
  },

  // ── BẢO HÀNH ────────────────────────────────────────────────────────────────
  {
    id: 'faq-bao-hanh-1',
    topic: 'bảo hành',
    question: 'Thế Giới Di Động bảo hành sản phẩm như thế nào?',
    answer: 'TGDD hỗ trợ bảo hành chính hãng: Bạn mang sản phẩm đến bất kỳ cửa hàng Thế Giới Di Động nào để được hỗ trợ gửi bảo hành tại trung tâm bảo hành của hãng. TGDD còn cho mượn điện thoại dùng tạm trong thời gian bảo hành.',
    keywords: ['bảo hành', 'bảo hành chính hãng', 'trung tâm bảo hành', 'sửa chữa'],
  },
  {
    id: 'faq-bao-hanh-2',
    topic: 'bảo hành',
    question: 'Thời gian bảo hành điện thoại là bao lâu?',
    answer: 'Điện thoại được bảo hành chính hãng 12 tháng. Laptop và tablet thường 12-24 tháng tùy hãng. Phụ kiện được bảo hành 6-12 tháng. Apple Watch bảo hành 12 tháng.',
    keywords: ['thời gian bảo hành', 'bảo hành bao lâu', 'bảo hành điện thoại', 'bảo hành laptop'],
  },
  {
    id: 'faq-bao-hanh-3',
    topic: 'bảo hành',
    question: 'Nếu sửa chữa quá 15 ngày thì sao?',
    answer: 'Nếu thời gian sửa chữa vượt quá 15 ngày hoặc hàng phải bảo hành lại trong vòng 30 ngày, bạn có quyền yêu cầu đổi máy mới hoặc hoàn tiền với mức khấu trừ ưu đãi.',
    keywords: ['bảo hành lâu', 'đổi máy mới', 'hoàn tiền bảo hành', 'bảo hành 15 ngày'],
  },

  // ── GIAO HÀNG ────────────────────────────────────────────────────────────────
  {
    id: 'faq-giao-hang-1',
    topic: 'giao hàng',
    question: 'Thế Giới Di Động giao hàng đến đâu và trong bao lâu?',
    answer: 'TGDD giao hàng toàn quốc. Giao nhanh nội thành (trong 20km): 1-2 giờ. Giao tiêu chuẩn nội thành: trong ngày. Liên tỉnh và vùng sâu xa: 2-6 ngày tùy khu vực.',
    keywords: ['giao hàng', 'thời gian giao hàng', 'giao nhanh', 'ship hàng', 'giao toàn quốc'],
  },
  {
    id: 'faq-giao-hang-2',
    topic: 'giao hàng',
    question: 'Phí giao hàng là bao nhiêu?',
    answer: 'Phí giao hàng miễn phí hoặc có phí tùy theo khoảng cách và giá trị đơn hàng. Chi tiết phí giao hàng sẽ hiển thị chính xác khi bạn đặt hàng trực tuyến trên website.',
    keywords: ['phí giao hàng', 'phí ship', 'miễn phí giao hàng', 'ship phí'],
  },
  {
    id: 'faq-giao-hang-3',
    topic: 'giao hàng',
    question: 'Có thể đặt hàng online rồi nhận tại cửa hàng không?',
    answer: 'Có. Bạn có thể đặt hàng online và chọn hình thức nhận tại cửa hàng (Click & Collect). Sau khi đặt hàng thành công, nhân viên sẽ liên hệ xác nhận và bạn đến cửa hàng gần nhất để nhận.',
    keywords: ['nhận tại cửa hàng', 'click collect', 'đặt online nhận cửa hàng'],
  },

  // ── THANH TOÁN ────────────────────────────────────────────────────────────────
  {
    id: 'faq-thanh-toan-1',
    topic: 'thanh toán',
    question: 'Thế Giới Di Động hỗ trợ những hình thức thanh toán nào?',
    answer: 'TGDD hỗ trợ: Tiền mặt (tại cửa hàng hoặc COD khi giao hàng), thẻ ATM nội địa, Visa/MasterCard (cà tại cửa hàng hoặc tại nhà), chuyển khoản ngân hàng, và các ví điện tử: MoMo, ZaloPay, VNPay, quét mã QR.',
    keywords: ['thanh toán', 'hình thức thanh toán', 'tiền mặt', 'thẻ', 'momo', 'zalopay', 'vnpay', 'qr'],
  },
  {
    id: 'faq-thanh-toan-2',
    topic: 'thanh toán',
    question: 'Có thanh toán COD (tiền mặt khi nhận hàng) không?',
    answer: 'Có. Bạn có thể chọn thanh toán tiền mặt khi nhân viên giao hàng đến (COD). Nhân viên giao hàng có thiết bị để cà thẻ tại nhà nếu bạn muốn thanh toán bằng thẻ khi nhận hàng.',
    keywords: ['COD', 'tiền mặt khi nhận hàng', 'thanh toán khi nhận', 'cà thẻ tại nhà'],
  },

  // ── TRẢ GÓP ────────────────────────────────────────────────────────────────
  {
    id: 'faq-tra-gop-1',
    topic: 'trả góp',
    question: 'Mua trả góp tại Thế Giới Di Động cần điều kiện gì?',
    answer: 'Điều kiện mua trả góp: Độ tuổi từ 18-60 tuổi (đối tác ACS hỗ trợ đến 65 tuổi), chỉ cần Căn cước công dân (CCCD) còn hạn sử dụng. Xét duyệt nhanh 15-30 phút ngay tại cửa hàng.',
    keywords: ['trả góp', 'điều kiện trả góp', 'mua trả chậm', 'mua góp', 'cccd'],
  },
  {
    id: 'faq-tra-gop-2',
    topic: 'trả góp',
    question: 'Thế Giới Di Động hợp tác với công ty tài chính nào cho trả góp?',
    answer: 'TGDD hợp tác với: Home Credit, FE Credit, HD Saison, Shinhan Finance, và ACS. Ngoài ra còn hỗ trợ trả góp 0% lãi suất qua thẻ tín dụng các ngân hàng cho nhiều dòng sản phẩm.',
    keywords: ['công ty tài chính', 'home credit', 'fe credit', 'hd saison', 'shinhan', 'trả góp 0%'],
  },
  {
    id: 'faq-tra-gop-3',
    topic: 'trả góp',
    question: 'Trả góp 0% lãi suất là như thế nào?',
    answer: 'Trả góp 0% lãi suất qua thẻ tín dụng: Bạn không phải trả thêm bất kỳ chi phí nào ngoài giá niêm yết. Thời hạn trả góp từ 6-12 tháng. Áp dụng cho nhiều dòng sản phẩm iPhone, Samsung, laptop...',
    keywords: ['trả góp 0%', 'lãi suất 0%', 'thẻ tín dụng', 'trả góp không lãi'],
  },

  // ── GIỜ MỞ CỬA & CỬA HÀNG ────────────────────────────────────────────────────
  {
    id: 'faq-cua-hang-1',
    topic: 'giờ mở cửa',
    question: 'Giờ mở cửa của Thế Giới Di Động là mấy giờ?',
    answer: 'Hệ thống cửa hàng Thế Giới Di Động mở cửa từ 8:00 đến 21:00 hàng ngày, bao gồm cả cuối tuần và ngày lễ.',
    keywords: ['giờ mở cửa', 'giờ làm việc', 'mấy giờ mở', 'cửa hàng mở lúc nào'],
  },
  {
    id: 'faq-cua-hang-2',
    topic: 'cửa hàng',
    question: 'Tìm cửa hàng Thế Giới Di Động gần nhất ở đâu?',
    answer: 'Bạn có thể tìm cửa hàng TGDD gần nhất tại mục "Hệ thống cửa hàng" trên website thegioididong.com, hoặc tìm kiếm "Thế Giới Di Động" trên Google Maps. Hiện tại có hơn 2.000 cửa hàng trên toàn quốc.',
    keywords: ['cửa hàng gần nhất', 'tìm cửa hàng', 'địa chỉ cửa hàng', 'hệ thống cửa hàng'],
  },

  // ── KHUYẾN MÃI ────────────────────────────────────────────────────────────────
  {
    id: 'faq-khuyen-mai-1',
    topic: 'khuyến mãi',
    question: 'Thế Giới Di Động có chương trình khuyến mãi nào không?',
    answer: 'TGDD thường xuyên có các chương trình: Thu cũ đổi mới (giảm thêm khi đổi máy cũ), ưu đãi thành viên MWG Member, khuyến mãi theo tháng trên website và app TGDD. Theo dõi tại thegioididong.com/khuyen-mai.',
    keywords: ['khuyến mãi', 'ưu đãi', 'giảm giá', 'thu cũ đổi mới', 'flash sale'],
  },

  // ── HỖ TRỢ KHÁCH HÀNG ────────────────────────────────────────────────────────
  {
    id: 'faq-hotro-1',
    topic: 'hỗ trợ',
    question: 'Liên hệ hỗ trợ Thế Giới Di Động qua đâu?',
    answer: 'Đường dây hỗ trợ khách hàng TGDD: Hotline 1800 2091 (miễn phí, 24/7). Ngoài ra có thể chat trực tiếp trên website thegioididong.com hoặc email cskh@thegioididong.com.',
    keywords: ['hotline', 'liên hệ', 'hỗ trợ khách hàng', 'tổng đài', 'cskh', '1800 2091'],
  },
  {
    id: 'faq-hotro-2',
    topic: 'hỗ trợ',
    question: 'Tôi muốn khiếu nại về sản phẩm hoặc dịch vụ thì làm thế nào?',
    answer: 'Để khiếu nại, bạn có thể: Gọi hotline 1800 2091 (miễn phí), đến trực tiếp cửa hàng gần nhất, hoặc gửi email tới cskh@thegioididong.com. Nhân viên sẽ phản hồi trong vòng 24 giờ làm việc.',
    keywords: ['khiếu nại', 'phản ánh', 'complaint', 'hỗ trợ', 'vấn đề', 'phản hồi'],
  },
];

// ─── Cloudflare AI Embed via REST ────────────────────────────────────────────
async function embed(texts: string[]): Promise<number[][]> {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/${EMBED_MODEL}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: texts }),
    }
  );
  if (!res.ok) throw new Error(`Embed failed: ${res.status} ${await res.text()}`);
  const json: any = await res.json();
  return json.result?.data ?? [];
}

// ─── Vectorize upsert via REST ────────────────────────────────────────────────
async function upsertVectors(vectors: { id: string; values: number[]; metadata: Record<string, string> }[]) {
  // Cloudflare Vectorize NDJSON format
  const ndjson = vectors.map(v => JSON.stringify(v)).join('\n');
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/vectorize/v2/indexes/${INDEX_NAME}/upsert`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/x-ndjson',
      },
      body: ndjson,
    }
  );
  if (!res.ok) throw new Error(`Upsert failed: ${res.status} ${await res.text()}`);
  return res.json();
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`🚀 Seeding ${faqEntries.length} FAQ entries into Vectorize index: ${INDEX_NAME}`);
  console.log(`   Account: ${ACCOUNT_ID}`);

  const BATCH = 10;

  for (let i = 0; i < faqEntries.length; i += BATCH) {
    const batch = faqEntries.slice(i, i + BATCH);

    // Build text to embed: question + answer + keywords
    const texts = batch.map(f =>
      `${f.question}\n${f.answer}\nKeywords: ${f.keywords.join(', ')}`
    );

    console.log(`\n📦 Batch ${Math.floor(i / BATCH) + 1}: embedding ${batch.length} entries...`);
    const embeddings = await embed(texts);

    const vectors = batch.map((f, idx) => ({
      id: f.id,
      values: embeddings[idx],
      metadata: {
        topic: f.topic,
        question: f.question,
        answer: f.answer,
        keywords: f.keywords.join(','),
        type: 'faq',
      },
    }));

    const result = await upsertVectors(vectors);
    console.log(`   ✅ Upserted: ${JSON.stringify((result as any).result)}`);
  }

  console.log('\n🎉 FAQ seeding complete!');
  console.log(`   Total entries: ${faqEntries.length}`);
  console.log(`   Topics: đổi trả, bảo hành, giao hàng, thanh toán, trả góp, giờ mở cửa, khuyến mãi, hỗ trợ`);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
