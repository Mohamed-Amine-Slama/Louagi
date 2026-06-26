// Full long-form legal content for Terms, Privacy and Refund/Cancellation,
// transcribed from docs/legal/*.md (the canonical source) and localised to
// en/fr/ar. Consumed by the registration legal modal (RegisterScreen) and the
// shared Support screen (SupportScreen → LegalPanel). Each doc is an array of
// { heading, text } sections so both surfaces render the same source of truth.
export const LEGAL_CONTENT = {
  en: {
    terms: {
      title: "Terms of Service",
      sections: [
        {
          heading: "1. Description of Services",
          text: "Louagi is a technology platform connecting passengers with verified independent drivers operating licensed louages on fixed inter-city routes in Tunisia. Louagi is not a transportation carrier and does not provide transport services itself."
        },
        {
          heading: "2. Account Registration & Vetting",
          text: "Passengers register with full name, phone and email, activated by a 6-digit SMS code. Drivers must upload a National ID, professional licence and vehicle photo and start in Pending Review — they cannot publish rides or accept bookings until an admin approves their documents. Admins may suspend accounts for fraud or misconduct, and may impersonate accounts for support, with every action recorded in an immutable audit log."
        },
        {
          heading: "3. Pricing, Fees & Revenue Splits",
          text: "Fares are fixed per route by the Tunisian transport authority; drivers cannot set or negotiate prices. Each seat booking adds a flat 3 TND reservation surcharge, split 2 TND to the driver and 1 TND to Louagi. Payments run through tokenized gateways (Flouci/Konnect) and full card or bank details are never stored."
        },
        {
          heading: "4. Bookings & Seat Locks",
          text: "Starting a booking places an atomic 10-minute seat lock to prevent double-booking; if payment is not completed within the window the seats are released back to inventory. On payment a confirmed ticket is generated with a unique reference showing the ride, driver, seat count and total paid."
        },
        {
          heading: "5. Cancellation & Refund",
          text: "Passengers may cancel up to 2 hours before departure and are refunded the seat fare; the 3 TND surcharge is non-refundable, and cancellations under 2 hours are blocked. If a driver cancels, all reservations are voided and passengers are refunded in full including the surcharge. Drivers may not cancel a ride already in progress or completed."
        },
        {
          heading: "6. Parcel Delivery Services",
          text: "Users can book cargo slots for parcels in three tiers — Standard, Sensitive/Fragile and Critical/High-Value — at a fixed price shown before booking. The sender must hand the parcel to the driver at the louage station and provide accurate recipient information."
        },
        {
          heading: "7. Code of Conduct",
          text: "Passengers and drivers agree to behave respectfully at stations and during transit. Drivers must keep their vehicle safe, clean and roadworthy; passengers must arrive before departure. Fraudulent or abusive behaviour results in immediate suspension."
        },
        {
          heading: "8. Limitation of Liability",
          text: "Louagi acts solely as an intermediary reservation system and is not liable for travel delays, service interruptions, accidents, disputes between passengers and drivers, or lost or damaged parcels."
        }
      ]
    },
    privacy: {
      title: "Privacy Policy",
      sections: [
        {
          heading: "1. Information We Collect",
          text: "We collect passenger profile data (name, phone, email, language) and travel history (route queries, bookings and transactions). For drivers we collect vetting documents (National ID, licence, vehicle photo), vehicle details and Flouci/Konnect payout identifiers. We also log IP addresses and device identifiers for security and session management."
        },
        {
          heading: "2. How We Secure & Store Data",
          text: "Sensitive personal data such as phone numbers and driver documents is encrypted at the field level before storage. We never store card details — all payments are tokenized by the gateways (Flouci/Konnect) and only transaction references are kept. Face ID and fingerprint sign-in are processed locally in your device's secure enclave; Louagi never collects or transmits biometric data."
        },
        {
          heading: "3. Security & Admin Safeguards",
          text: "Every major action — logins, ride publishing, booking confirmations, cancellations, suspensions and admin impersonations — is permanently recorded in an append-only, tamper-resistant audit log that no user or admin can alter. Access to admin dashboards and sensitive backend commands is restricted by IP allowlisting to the internal operations network."
        },
        {
          heading: "4. Your Rights (GDPR)",
          text: "You can request a structured, machine-readable export of your profile, bookings, deliveries and support tickets from Settings. You may also permanently delete your account, which deactivates it and removes your profile from searches; past transaction records are retained in the immutable audit log for the statutory period required by Tunisian law."
        }
      ]
    },
    refunds: {
      title: "Refund & Cancellation Policy",
      sections: [
        {
          heading: "1. Passenger Cancellations",
          text: "You may cancel a confirmed booking up to 2 hours before departure. The seat fare is fully refunded to your original payment method, but the flat 3 TND reservation surcharge is non-refundable."
        },
        {
          heading: "2. The 2-Hour Limit",
          text: "Cancellations requested less than 2 hours before departure are strictly prohibited; the platform blocks the action and no refund of any kind is issued."
        },
        {
          heading: "3. Driver & Admin Cancellations",
          text: "If a driver cancels, all passengers are automatically refunded 100% — the full seat fare plus the 3 TND surcharge. Admins may override the 2-hour window in exceptional cases (breakdown, emergency, security), and these cancellations also trigger a full refund."
        },
        {
          heading: "4. Refund Processing & Timeline",
          text: "Refunds are initiated immediately upon cancellation and credited back to your linked gateway account (Flouci/Konnect), typically within 1 to 5 business days depending on the gateway and your card issuer. All cancellation and refund actions are recorded in the immutable audit log."
        }
      ]
    }
  },
  fr: {
    terms: {
      title: "Conditions d'utilisation",
      sections: [
        {
          heading: "1. Description des services",
          text: "Louagi est une plateforme technologique reliant les passagers à des chauffeurs indépendants vérifiés exploitant des louages licenciés sur des trajets interurbains à tarif fixe en Tunisie. Louagi n'est pas un transporteur et ne fournit pas elle-même de service de transport."
        },
        {
          heading: "2. Inscription & Vérification des comptes",
          text: "Les passagers s'inscrivent avec nom, téléphone et e-mail, activés par un code à 6 chiffres envoyé par SMS. Les chauffeurs doivent téléverser une carte d'identité, un permis professionnel et une photo du véhicule, et démarrent en statut « En attente de révision » : ils ne peuvent ni publier de trajets ni accepter de réservations avant l'approbation d'un administrateur. Les administrateurs peuvent suspendre des comptes en cas de fraude ou d'abus, et impersonner un compte pour le support, chaque action étant enregistrée dans un journal d'audit inviolable."
        },
        {
          heading: "3. Tarifs, frais et répartition",
          text: "Les tarifs sont fixés par trajet par l'autorité tunisienne des transports ; les chauffeurs ne peuvent ni fixer ni négocier les prix. Chaque réservation de place ajoute des frais de réservation fixes de 3 TND, répartis en 2 TND pour le chauffeur et 1 TND pour Louagi. Les paiements passent par des passerelles tokenisées (Flouci/Konnect) et aucune coordonnée bancaire complète n'est conservée."
        },
        {
          heading: "4. Réservations et verrouillage des places",
          text: "Démarrer une réservation place un verrou atomique de 10 minutes sur les places pour éviter les doubles réservations ; si le paiement n'est pas finalisé dans ce délai, les places sont libérées. Au paiement, un billet confirmé est généré avec une référence unique indiquant le trajet, le chauffeur, le nombre de places et le montant payé."
        },
        {
          heading: "5. Annulation et remboursement",
          text: "Les passagers peuvent annuler jusqu'à 2 heures avant le départ et sont remboursés du tarif de la place ; les frais de 3 TND ne sont pas remboursables, et les annulations à moins de 2 heures sont bloquées. Si un chauffeur annule, toutes les réservations sont annulées et les passagers intégralement remboursés, frais compris. Les chauffeurs ne peuvent pas annuler un trajet déjà en cours ou terminé."
        },
        {
          heading: "6. Services de livraison de colis",
          text: "Les utilisateurs peuvent réserver des emplacements cargo pour des colis selon trois niveaux — Standard, Sensible/Fragile et Critique/Haute valeur — à un prix fixe affiché avant la réservation. L'expéditeur doit remettre le colis au chauffeur à la station de louage et fournir des informations exactes sur le destinataire."
        },
        {
          heading: "7. Code de conduite",
          text: "Passagers et chauffeurs s'engagent à se comporter respectueusement aux stations et durant le trajet. Les chauffeurs doivent maintenir leur véhicule sûr, propre et en bon état ; les passagers doivent arriver avant le départ. Tout comportement frauduleux ou abusif entraîne une suspension immédiate."
        },
        {
          heading: "8. Limitation de responsabilité",
          text: "Louagi agit uniquement comme système de réservation intermédiaire et n'est pas responsable des retards, interruptions de service, accidents, litiges entre passagers et chauffeurs, ni des colis perdus ou endommagés."
        }
      ]
    },
    privacy: {
      title: "Politique de confidentialité",
      sections: [
        {
          heading: "1. Informations collectées",
          text: "Nous collectons les données de profil des passagers (nom, téléphone, e-mail, langue) et l'historique de voyage (recherches, réservations et transactions). Pour les chauffeurs, nous collectons les documents de vérification (carte d'identité, permis, photo du véhicule), les détails du véhicule et les identifiants de paiement Flouci/Konnect. Nous enregistrons aussi les adresses IP et identifiants d'appareil pour la sécurité et la gestion des sessions."
        },
        {
          heading: "2. Sécurité et stockage des données",
          text: "Les données personnelles sensibles, comme les numéros de téléphone et les documents des chauffeurs, sont chiffrées au niveau du champ avant stockage. Nous ne stockons jamais de coordonnées bancaires — tous les paiements sont tokenisés par les passerelles (Flouci/Konnect) et seules les références de transaction sont conservées. Face ID et l'empreinte digitale sont traités localement dans l'enclave sécurisée de votre appareil ; Louagi ne collecte ni ne transmet jamais de données biométriques."
        },
        {
          heading: "3. Garanties de sécurité et d'administration",
          text: "Chaque action majeure — connexions, publication de trajets, confirmations de réservation, annulations, suspensions et impersonations d'administrateur — est enregistrée de façon permanente dans un journal d'audit inaltérable qu'aucun utilisateur ni administrateur ne peut modifier. L'accès aux tableaux de bord d'administration et aux commandes sensibles est restreint par liste d'IP autorisées au réseau interne des opérations."
        },
        {
          heading: "4. Vos droits (RGPD)",
          text: "Vous pouvez demander un export structuré et lisible par machine de votre profil, réservations, livraisons et tickets de support depuis les réglages. Vous pouvez aussi supprimer définitivement votre compte, ce qui le désactive et retire votre profil des recherches ; les enregistrements des transactions passées sont conservés dans le journal d'audit inviolable pendant la période légale requise par la loi tunisienne."
        }
      ]
    },
    refunds: {
      title: "Politique de remboursement",
      sections: [
        {
          heading: "1. Annulation par le passager",
          text: "Vous pouvez annuler une réservation confirmée jusqu'à 2 heures avant le départ. Le tarif de la place est intégralement remboursé sur votre moyen de paiement d'origine, mais les frais de réservation fixes de 3 TND ne sont pas remboursables."
        },
        {
          heading: "2. La limite des 2 heures",
          text: "Les annulations demandées à moins de 2 heures du départ sont strictement interdites ; la plateforme bloque l'action et aucun remboursement n'est accordé."
        },
        {
          heading: "3. Annulation par le chauffeur ou l'administrateur",
          text: "Si un chauffeur annule, tous les passagers sont automatiquement remboursés à 100 % — tarif de la place plus les frais de 3 TND. Les administrateurs peuvent contourner la limite de 2 heures dans des cas exceptionnels (panne, urgence, sécurité), ces annulations déclenchant aussi un remboursement intégral."
        },
        {
          heading: "4. Traitement et délais de remboursement",
          text: "Les remboursements sont initiés immédiatement après l'annulation et recrédités sur votre compte passerelle lié (Flouci/Konnect), généralement sous 1 à 5 jours ouvrables selon la passerelle et l'émetteur de votre carte. Toutes les annulations et remboursements sont consignés dans le journal d'audit inviolable."
        }
      ]
    }
  },
  ar: {
    terms: {
      title: "شروط الخدمة",
      sections: [
        {
          heading: "1. وصف الخدمات",
          text: "لواج منصة تقنية تربط الركاب بسائقين مستقلين موثّقين يشغّلون لواجات مرخّصة على مسارات بين المدن بأسعار ثابتة في تونس. لواج ليست شركة نقل ولا تقدّم خدمات النقل بنفسها."
        },
        {
          heading: "2. التسجيل والتوثيق",
          text: "يسجّل الركاب بالاسم الكامل ورقم الهاتف والبريد الإلكتروني، ويتم التفعيل برمز من 6 أرقام عبر الرسائل القصيرة. يجب على السائقين تحميل بطاقة التعريف الوطنية ورخصة مهنية وصورة للسيارة، ويبدؤون بحالة «قيد المراجعة»: لا يمكنهم نشر الرحلات أو قبول الحجوزات قبل موافقة المشرف. يحق للمشرفين تعليق الحسابات في حالات الاحتيال أو سوء السلوك، وانتحال الحساب لأغراض الدعم مع تسجيل كل إجراء في سجل تدقيق غير قابل للتعديل."
        },
        {
          heading: "3. الأسعار والرسوم والتقسيم",
          text: "تحدد سلطة النقل التونسية الأسعار لكل مسار، ولا يمكن للسائقين تحديد الأسعار أو التفاوض عليها. تضيف كل عملية حجز رسوم حجز ثابتة قدرها 3 د.ت، تُقسّم 2 د.ت للسائق و1 د.ت لمنصة لواج. تتم المدفوعات عبر بوابات مشفّرة (Flouci/Konnect) ولا تُحفظ أي بيانات بنكية كاملة."
        },
        {
          heading: "4. الحجوزات وقفل المقاعد",
          text: "يؤدي بدء الحجز إلى قفل ذرّي للمقاعد لمدة 10 دقائق لمنع الحجز المزدوج؛ وإذا لم يكتمل الدفع خلال هذه المدة تُحرَّر المقاعد. عند الدفع تُصدر تذكرة مؤكدة برقم مرجعي فريد يوضّح الرحلة والسائق وعدد المقاعد والمبلغ المدفوع."
        },
        {
          heading: "5. الإلغاء والاسترداد",
          text: "يمكن للركاب الإلغاء حتى ساعتين قبل المغادرة واسترداد سعر المقعد؛ أما رسوم الـ3 د.ت فغير قابلة للاسترداد، وتُمنع الإلغاءات قبل أقل من ساعتين. إذا ألغى السائق، تُلغى جميع الحجوزات ويُسترد للركاب كامل المبلغ بما في ذلك الرسوم. لا يمكن للسائقين إلغاء رحلة قيد التنفيذ أو مكتملة."
        },
        {
          heading: "6. خدمات توصيل الطرود",
          text: "يمكن للمستخدمين حجز مساحات شحن للطرود ضمن ثلاثة مستويات — عادي، حسّاس/قابل للكسر، وحرج/عالي القيمة — بسعر ثابت يُعرض قبل الحجز. على المُرسِل تسليم الطرد للسائق في محطة اللواج وتقديم معلومات دقيقة عن المستلِم."
        },
        {
          heading: "7. قواعد السلوك",
          text: "يلتزم الركاب والسائقون بالتصرّف باحترام في المحطات وأثناء التنقّل. على السائقين الحفاظ على سياراتهم آمنة ونظيفة وصالحة للسير؛ وعلى الركاب الحضور قبل المغادرة. يؤدي أي سلوك احتيالي أو مسيء إلى الإيقاف الفوري."
        },
        {
          heading: "8. حدود المسؤولية",
          text: "تعمل لواج كنظام حجز وسيط فقط، وليست مسؤولة عن تأخر السفر أو انقطاع الخدمة أو الحوادث أو النزاعات بين الركاب والسائقين أو فقدان الطرود أو تلفها."
        }
      ]
    },
    privacy: {
      title: "سياسة الخصوصية",
      sections: [
        {
          heading: "1. المعلومات التي نجمعها",
          text: "نجمع بيانات ملف الراكب (الاسم والهاتف والبريد واللغة) وسجل السفر (عمليات البحث والحجوزات والمعاملات). وبالنسبة للسائقين نجمع مستندات التوثيق (بطاقة التعريف والرخصة وصورة السيارة) وتفاصيل المركبة ومعرّفات الدفع Flouci/Konnect. كما نسجّل عناوين IP ومعرّفات الأجهزة لأغراض الأمان وإدارة الجلسات."
        },
        {
          heading: "2. تأمين البيانات وتخزينها",
          text: "تُشفَّر البيانات الشخصية الحساسة مثل أرقام الهواتف ومستندات السائقين على مستوى الحقل قبل تخزينها. لا نخزّن بيانات البطاقات أبداً — فكل المدفوعات مشفّرة عبر البوابات (Flouci/Konnect) ولا يُحفظ سوى مراجع المعاملات. تُعالج بصمة الوجه والإصبع محلياً داخل المعالج الآمن لجهازك، ولا تجمع لواج بياناتك الحيوية أو ترسلها أبداً."
        },
        {
          heading: "3. ضمانات الأمان والإشراف",
          text: "يُسجَّل كل إجراء رئيسي — تسجيلات الدخول ونشر الرحلات وتأكيد الحجوزات والإلغاءات والإيقافات وانتحال المشرفين — بشكل دائم في سجل تدقيق غير قابل للتعديل لا يستطيع أي مستخدم أو مشرف تغييره. ويُقيَّد الوصول إلى لوحات الإشراف والأوامر الحساسة عبر قائمة عناوين IP مسموح بها ضمن شبكة العمليات الداخلية."
        },
        {
          heading: "4. حقوقك (GDPR)",
          text: "يمكنك طلب تصدير منظَّم وقابل للقراءة آلياً لملفك وحجوزاتك وعمليات التوصيل وتذاكر الدعم من الإعدادات. كما يمكنك حذف حسابك نهائياً، ما يعطّله ويزيل ملفك من نتائج البحث؛ وتُحفظ سجلات المعاملات السابقة في سجل التدقيق غير القابل للتعديل طوال المدة القانونية التي يفرضها القانون التونسي."
        }
      ]
    },
    refunds: {
      title: "سياسة إلغاء الحجز والاسترداد",
      sections: [
        {
          heading: "1. إلغاء الحجز من الراكب",
          text: "يمكنك إلغاء حجز مؤكد حتى ساعتين قبل المغادرة. يُسترد سعر المقعد بالكامل إلى وسيلة الدفع الأصلية، لكن رسوم الحجز الثابتة البالغة 3 د.ت غير قابلة للاسترداد."
        },
        {
          heading: "2. مهلة الساعتين",
          text: "يُمنع منعاً باتاً الإلغاء قبل أقل من ساعتين من المغادرة؛ تحجب المنصة العملية ولا يُصرف أي استرداد."
        },
        {
          heading: "3. الإلغاء من السائق أو المشرف",
          text: "إذا ألغى السائق، يُسترد لجميع الركاب كامل المبلغ 100% — سعر المقعد إضافة إلى رسوم الـ3 د.ت. ويمكن للمشرفين تجاوز مهلة الساعتين في حالات استثنائية (عطل، طوارئ، أمن)، وتؤدي هذه الإلغاءات أيضاً إلى استرداد كامل."
        },
        {
          heading: "4. معالجة الاسترداد ومدّته",
          text: "تبدأ عمليات الاسترداد فور الإلغاء وتُعاد إلى حساب البوابة المرتبط (Flouci/Konnect)، عادةً خلال 1 إلى 5 أيام عمل حسب البوابة ومُصدِر البطاقة. وتُسجَّل جميع عمليات الإلغاء والاسترداد في سجل التدقيق غير القابل للتعديل."
        }
      ]
    }
  }
};
