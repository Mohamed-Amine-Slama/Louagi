export const LEGAL_CONTENT = {
  en: {
    terms: {
      title: "Terms of Service",
      sections: [
        {
          heading: "1. Vetting & Accounts",
          text: "Drivers must upload valid credentials (ID, License, Vehicle photo) and undergo manual Admin verification before publishing rides."
        },
        {
          heading: "2. Government-Set Fares",
          text: "Fares are fixed per route by the Tunisian transport authority. Drivers do not set pricing."
        },
        {
          heading: "3. Booking Fees & Splits",
          text: "Each booking has a 3 TND flat service fee: 2 TND goes directly to the driver, and 1 TND goes to the Louagi platform."
        },
        {
          heading: "4. Travel Conduct",
          text: "Passengers must arrive on time. Double-booking or abusive behavior will result in immediate account suspension."
        }
      ]
    },
    privacy: {
      title: "Privacy Policy",
      sections: [
        {
          heading: "1. Data Collection & Encryption",
          text: "We collect profile data, phone numbers, and driver documents. All sensitive fields are encrypted before database storage."
        },
        {
          heading: "2. Payment Security",
          text: "Payment details are processed entirely by tokenized mobile gateways (Flouci/Konnect). Louagi does not store card data."
        },
        {
          heading: "3. Local Biometric Data",
          text: "Face ID and fingerprint authentication are processed locally on your device secure enclave and never transmitted to our servers."
        },
        {
          heading: "4. Your Rights (GDPR)",
          text: "You can request a data export of your profile and bookings, or permanently delete your account directly from settings."
        }
      ]
    },
    refunds: {
      title: "Refund & Cancellation Policy",
      sections: [
        {
          heading: "1. Passenger Cancellations",
          text: "You can cancel bookings up to 2 hours before departure. The 3 TND service fee is non-refundable; only seat fare is returned."
        },
        {
          heading: "2. The 2-Hour Limit",
          text: "Cancellations requested within 2 hours of departure are strictly prohibited and no refund will be issued."
        },
        {
          heading: "3. Driver & Admin Cancellations",
          text: "If a driver or admin cancels a ride, passengers receive a 100% full refund (seat fare + 3 TND fee) back to their gateway account."
        }
      ]
    }
  },
  fr: {
    terms: {
      title: "Conditions d'utilisation",
      sections: [
        {
          heading: "1. Comptes & Vérification",
          text: "Les chauffeurs doivent téléverser leurs justificatifs (identité, permis, véhicule) pour approbation manuelle par un admin avant de publier."
        },
        {
          heading: "2. Tarifs Réglementés par l'État",
          text: "Les prix par place sont fixés par l'autorité tunisienne des transports. Les chauffeurs ne peuvent pas modifier les tarifs."
        },
        {
          heading: "3. Frais de Service",
          text: "Chaque réservation comprend des frais de service fixes de 3 TND : 2 TND vont au chauffeur et 1 TND est retenu par la plateforme."
        },
        {
          heading: "4. Code de Conduite",
          text: "Les passagers doivent arriver à l'heure. Les comportements abusifs ou réservations frauduleuses entraînent une suspension immédiate."
        }
      ]
    },
    privacy: {
      title: "Politique de confidentialité",
      sections: [
        {
          heading: "1. Collecte et Chiffrement",
          text: "Nous collectons les profils et documents. Les données sensibles (numéros de téléphone, identifiants) sont chiffrées en base."
        },
        {
          heading: "2. Tokenisation des Paiements",
          text: "Les transactions passent par des passerelles mobiles sécurisées (Flouci/Konnect). Louagi ne conserve aucune coordonnée bancaire."
        },
        {
          heading: "3. Sécurité Biométrique Locale",
          text: "Face ID et empreintes digitales sont traités localement sur l'appareil et ne sont jamais transmis à nos serveurs."
        },
        {
          heading: "4. Vos Droits (RGPD)",
          text: "Vous pouvez demander un export de vos données ou supprimer définitivement votre compte depuis vos réglages."
        }
      ]
    },
    refunds: {
      title: "Politique de remboursement",
      sections: [
        {
          heading: "1. Annulation Passager",
          text: "Annulation possible jusqu'à 2 heures avant le départ. Les frais de service de 3 TND sont non remboursables."
        },
        {
          heading: "2. Limite des 2 Heures",
          text: "Aucune annulation ni remboursement n'est accepté à moins de 2 heures du départ prévu."
        },
        {
          heading: "3. Annulation par le Chauffeur / Admin",
          text: "Si le chauffeur ou un administrateur annule, vous êtes remboursé à 100% (tarif place + 3 TND de frais de service)."
        }
      ]
    }
  },
  ar: {
    terms: {
      title: "شروط الخدمة",
      sections: [
        {
          heading: "1. الحسابات والتوثيق",
          text: "يجب على السائقين تحميل بطاقة التعريف والرخصة وصورة السيارة للتحقق اليدوي من المشرف قبل نشر الرحلات."
        },
        {
          heading: "2. الأسعار المحددة من الدولة",
          text: "تحدد سلطة النقل التونسية الأسعار لكل مسار بشكل إجباري، ولا يمكن للسائقين تغييرها."
        },
        {
          heading: "3. رسوم الحجز وتقسيمها",
          text: "تخضع كل عملية حجز لرسوم خدمة تبلغ 3 د.ت: يذهب 2 د.ت مباشرة للسائق، و 1 د.ت لمنصة لواج."
        },
        {
          heading: "4. سلوك السفر",
          text: "يجب على الركاب الحضور في الوقت المحدد. الحجز المزدوج أو السلوك المسيء يعرض الحساب للإيقاف الفوري."
        }
      ]
    },
    privacy: {
      title: "سياسة الخصوصية",
      sections: [
        {
          heading: "1. جمع البيانات وتشفيرها",
          text: "نجمع بيانات الحساب والمستندات. نقوم بتشفير الحقول الحساسة (مثل أرقام الهواتف) قبل حفظها في قاعدة البيانات."
        },
        {
          heading: "2. أمان الدفع",
          text: "تتم معالجة المدفوعات بالكامل عبر بوابات الدفع المشفرة (Flouci/Konnect)، ولا تحفظ المنصة أي بيانات بنكية."
        },
        {
          heading: "3. البيانات الحيوية المحلية",
          text: "تتم معالجة Face ID والبصمة محليًا بالكامل داخل جهازك ولا ترسل أبدًا إلى خوادمنا."
        },
        {
          heading: "4. حقوقك وقوانين حماية البيانات",
          text: "يمكنك طلب تصدير بياناتك بالكامل أو حذف حسابك نهائياً من شاشة الإعدادات."
        }
      ]
    },
    refunds: {
      title: "سياسة إلغاء الحجز والاسترداد",
      sections: [
        {
          heading: "1. إلغاء الحجز من الراكب",
          text: "يمكنك إلغاء الحجز قبل ساعتين من الرحلة. رسوم الحجز (3 د.ت) غير مستردة ويتم إرجاع سعر المقعد فقط."
        },
        {
          heading: "2. مهلة الساعتين",
          text: "يمنع تماماً إلغاء الحجز أو استرداد الأموال إذا تبقت أقل من ساعتين على موعد انطلاق الرحلة."
        },
        {
          heading: "3. الإلغاء من السائق أو المشرف",
          text: "في حال إلغاء الرحلة من السائق أو المشرف، يسترد الراكب كامل المبلغ المدفوع بنسبة 100% (سعر المقعد + رسوم الخدمة 3 د.ت)."
        }
      ]
    }
  }
};
