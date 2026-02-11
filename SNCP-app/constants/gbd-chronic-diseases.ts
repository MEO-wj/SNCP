// Data source: GBD Results official hierarchy + metadata endpoints
// https://vizhub.healthdata.org/gbd-results/php/hierarchy/
// https://vizhub.healthdata.org/gbd-results/php/metadata/?language=zh
// https://vizhub.healthdata.org/gbd-results/php/metadata/?language=en

export type GbdChronicDiseaseNode = {
  id: number;
  code: string;
  name: string;
  nameEn: string;
  shortName: string;
  shortNameEn: string;
  mostDetailed: number;
  level: number;
  children: GbdChronicDiseaseNode[];
};

export const GBD_CHRONIC_DISEASE_ROOT_ID = 409;

export const GBD_CHRONIC_DISEASE_ROOT: GbdChronicDiseaseNode = 
{
  "id": 409,
  "code": "B",
  "name": "非传染性疾病",
  "nameEn": "Non-communicable diseases",
  "shortName": "非传染性疾病",
  "shortNameEn": "NCD",
  "mostDetailed": 0,
  "level": 0,
  "children": [
    {
      "id": 410,
      "code": "B.1",
      "name": "肿瘤",
      "nameEn": "Neoplasms",
      "shortName": "肿瘤",
      "shortNameEn": "Neoplasms",
      "mostDetailed": 0,
      "level": 1,
      "children": [
        {
          "id": 444,
          "code": "B.1.1",
          "name": "唇和口腔癌",
          "nameEn": "Lip and oral cavity cancer",
          "shortName": "口腔癌",
          "shortNameEn": "Lip Oral C",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 447,
          "code": "B.1.2",
          "name": "鼻咽癌",
          "nameEn": "Nasopharynx cancer",
          "shortName": "鼻咽癌",
          "shortNameEn": "Nasoph C",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 450,
          "code": "B.1.3",
          "name": "其他咽部癌症",
          "nameEn": "Other pharynx cancer",
          "shortName": "其他咽部癌症",
          "shortNameEn": "Oth Phar C",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 411,
          "code": "B.1.4",
          "name": "食道癌",
          "nameEn": "Esophageal cancer",
          "shortName": "食道癌",
          "shortNameEn": "Esophag C",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 414,
          "code": "B.1.5",
          "name": "胃癌",
          "nameEn": "Stomach cancer",
          "shortName": "胃癌",
          "shortNameEn": "Stomach C",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 441,
          "code": "B.1.6",
          "name": "结肠和直肠癌",
          "nameEn": "Colon and rectum cancer",
          "shortName": "结肠癌",
          "shortNameEn": "Colorect C",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 417,
          "code": "B.1.7",
          "name": "肝癌",
          "nameEn": "Liver cancer",
          "shortName": "肝癌",
          "shortNameEn": "Liver C",
          "mostDetailed": 0,
          "level": 2,
          "children": [
            {
              "id": 418,
              "code": "B.1.7.1",
              "name": "乙肝致肝癌",
              "nameEn": "Liver cancer due to hepatitis B",
              "shortName": "乙肝致肝癌",
              "shortNameEn": "Liver C HepB",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 419,
              "code": "B.1.7.2",
              "name": "丙肝致肝癌",
              "nameEn": "Liver cancer due to hepatitis C",
              "shortName": "丙肝致肝癌",
              "shortNameEn": "Liver C HepC",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 420,
              "code": "B.1.7.3",
              "name": "酒精致肝癌",
              "nameEn": "Liver cancer due to alcohol use",
              "shortName": "酒精致肝癌",
              "shortNameEn": "Liver C Alc",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 996,
              "code": "B.1.7.4",
              "name": "NASH引起的肝癌",
              "nameEn": "Liver cancer due to NASH",
              "shortName": "NASH引起的肝癌",
              "shortNameEn": "Liver C NASH",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 1005,
              "code": "B.1.7.5",
              "name": "肝母细胞瘤",
              "nameEn": "Hepatoblastoma",
              "shortName": "肝癌 肝母细胞瘤",
              "shortNameEn": "Liver C HBL",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 421,
              "code": "B.1.7.6",
              "name": "其他原因致肝癌(内)",
              "nameEn": "Liver cancer due to other causes",
              "shortName": "其他原因致肝癌(内)",
              "shortNameEn": "Oth Liver C",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            }
          ]
        },
        {
          "id": 453,
          "code": "B.1.8",
          "name": "胆囊和胆管癌",
          "nameEn": "Gallbladder and biliary tract cancer",
          "shortName": "胆囊癌",
          "shortNameEn": "Gallblad C",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 456,
          "code": "B.1.9",
          "name": "胰腺癌",
          "nameEn": "Pancreatic cancer",
          "shortName": "胰腺癌",
          "shortNameEn": "Pancreas C",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 423,
          "code": "B.1.10",
          "name": "喉癌",
          "nameEn": "Larynx cancer",
          "shortName": "喉癌",
          "shortNameEn": "Larynx C",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 426,
          "code": "B.1.11",
          "name": "气管、支气管和肺癌",
          "nameEn": "Tracheal, bronchus, and lung cancer",
          "shortName": "肺癌",
          "shortNameEn": "Lung C",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 459,
          "code": "B.1.12",
          "name": "恶性皮肤黑色素瘤",
          "nameEn": "Malignant skin melanoma",
          "shortName": "黑色素瘤",
          "shortNameEn": "Melanoma",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 462,
          "code": "B.1.13",
          "name": "非黑色素瘤皮肤癌",
          "nameEn": "Non-melanoma skin cancer",
          "shortName": "皮肤癌",
          "shortNameEn": "Skin C",
          "mostDetailed": 0,
          "level": 2,
          "children": [
            {
              "id": 849,
              "code": "B.1.13.1",
              "name": "非黑色素瘤皮肤癌(鳞状细胞癌)",
              "nameEn": "Non-melanoma skin cancer (squamous-cell carcinoma)",
              "shortName": "鳞癌",
              "shortNameEn": "SCC",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 850,
              "code": "B.1.13.2",
              "name": "非黑色素瘤皮肤癌（基底细胞癌）",
              "nameEn": "Non-melanoma skin cancer (basal-cell carcinoma)",
              "shortName": "基底细胞癌",
              "shortNameEn": "BCC",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            }
          ]
        },
        {
          "id": 1011,
          "code": "B.1.14",
          "name": "软组织和其他骨外肉瘤",
          "nameEn": "Soft tissue and other extraosseous sarcomas",
          "shortName": "组织肉瘤 癌症",
          "shortNameEn": "Tissue Sarcoma C",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 1012,
          "code": "B.1.15",
          "name": "骨和关节软骨恶性肿瘤",
          "nameEn": "Malignant neoplasm of bone and articular cartilage",
          "shortName": "恶性骨+软骨",
          "shortNameEn": "M Bone+Cartilage",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 429,
          "code": "B.1.16",
          "name": "乳腺癌",
          "nameEn": "Breast cancer",
          "shortName": "乳腺癌",
          "shortNameEn": "Breast C",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 432,
          "code": "B.1.17",
          "name": "宫颈癌",
          "nameEn": "Cervical cancer",
          "shortName": "宫颈癌",
          "shortNameEn": "Cervix C",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 435,
          "code": "B.1.18",
          "name": "子宫癌",
          "nameEn": "Uterine cancer",
          "shortName": "子宫癌",
          "shortNameEn": "Uterus C",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 465,
          "code": "B.1.19",
          "name": "卵巢癌",
          "nameEn": "Ovarian cancer",
          "shortName": "卵巢癌",
          "shortNameEn": "Ovary C",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 438,
          "code": "B.1.20",
          "name": "前列腺癌",
          "nameEn": "Prostate cancer",
          "shortName": "前列腺癌",
          "shortNameEn": "Prostate C",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 468,
          "code": "B.1.21",
          "name": "睾丸癌",
          "nameEn": "Testicular cancer",
          "shortName": "睾丸癌",
          "shortNameEn": "Testis C",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 471,
          "code": "B.1.22",
          "name": "肾癌",
          "nameEn": "Kidney cancer",
          "shortName": "肾癌",
          "shortNameEn": "Kidney C",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 474,
          "code": "B.1.23",
          "name": "膀胱癌",
          "nameEn": "Bladder cancer",
          "shortName": "膀胱癌",
          "shortNameEn": "Bladder C",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 477,
          "code": "B.1.24",
          "name": "脑和神经系统癌症",
          "nameEn": "Brain and central nervous system cancer",
          "shortName": "脑癌",
          "shortNameEn": "Brain C",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 1008,
          "code": "B.1.25",
          "name": "眼癌",
          "nameEn": "Eye cancer",
          "shortName": "眼癌",
          "shortNameEn": "Eye C",
          "mostDetailed": 0,
          "level": 2,
          "children": [
            {
              "id": 1009,
              "code": "B.1.25.1",
              "name": "视网膜母细胞瘤",
              "nameEn": "Retinoblastoma",
              "shortName": "眼癌 视网膜母细胞瘤",
              "shortNameEn": "Eye C RB",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 1010,
              "code": "B.1.25.2",
              "name": "其他眼癌",
              "nameEn": "Other eye cancers",
              "shortName": "其他眼癌",
              "shortNameEn": "Other Eye",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            }
          ]
        },
        {
          "id": 1013,
          "code": "B.1.26",
          "name": "神经母细胞瘤和其他周围神经细胞肿瘤",
          "nameEn": "Neuroblastoma and other peripheral nervous cell tumors",
          "shortName": "神经母细胞瘤",
          "shortNameEn": "Neuroblastoma",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 480,
          "code": "B.1.27",
          "name": "甲状腺癌",
          "nameEn": "Thyroid cancer",
          "shortName": "甲状腺癌",
          "shortNameEn": "Thyroid C",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 483,
          "code": "B.1.28",
          "name": "间皮瘤",
          "nameEn": "Mesothelioma",
          "shortName": "间皮瘤",
          "shortNameEn": "Mesothel",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 484,
          "code": "B.1.29",
          "name": "霍奇金淋巴瘤",
          "nameEn": "Hodgkin lymphoma",
          "shortName": "霍奇金淋巴瘤",
          "shortNameEn": "Hodgkin",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 485,
          "code": "B.1.30",
          "name": "非霍奇金淋巴瘤",
          "nameEn": "Non-Hodgkin lymphoma",
          "shortName": "淋巴瘤",
          "shortNameEn": "Lymphoma",
          "mostDetailed": 0,
          "level": 2,
          "children": [
            {
              "id": 1006,
              "code": "B.1.30.1",
              "name": "伯基特淋巴瘤",
              "nameEn": "Burkitt lymphoma",
              "shortName": "伯基特",
              "shortNameEn": "Burkitt",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 1007,
              "code": "B.1.30.2",
              "name": "其他非霍奇金淋巴瘤",
              "nameEn": "Other non-Hodgkin lymphoma",
              "shortName": "其他淋巴瘤",
              "shortNameEn": "Oth Lymphoma",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            }
          ]
        },
        {
          "id": 486,
          "code": "B.1.31",
          "name": "多发性骨髓瘤",
          "nameEn": "Multiple myeloma",
          "shortName": "骨髓瘤",
          "shortNameEn": "Myeloma",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 487,
          "code": "B.1.32",
          "name": "白血病",
          "nameEn": "Leukemia",
          "shortName": "白血病",
          "shortNameEn": "Leukemia",
          "mostDetailed": 0,
          "level": 2,
          "children": [
            {
              "id": 845,
              "code": "B.1.32.1",
              "name": "急性淋巴细胞白血病",
              "nameEn": "Acute lymphoid leukemia",
              "shortName": "急性淋巴细胞白血病",
              "shortNameEn": "ALL",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 846,
              "code": "B.1.32.2",
              "name": "慢性淋巴细胞白血病",
              "nameEn": "Chronic lymphoid leukemia",
              "shortName": "慢性淋巴细胞白血病",
              "shortNameEn": "CLL",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 847,
              "code": "B.1.32.3",
              "name": "急性髓细胞白血病",
              "nameEn": "Acute myeloid leukemia",
              "shortName": "急性髓细胞白血病",
              "shortNameEn": "AML",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 848,
              "code": "B.1.32.4",
              "name": "慢性髓细胞白血病",
              "nameEn": "Chronic myeloid leukemia",
              "shortName": "慢性髓细胞白血病",
              "shortNameEn": "CML",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 943,
              "code": "B.1.32.5",
              "name": "其他白血病",
              "nameEn": "Other leukemia",
              "shortName": "其他白血病",
              "shortNameEn": "Oth Leukemia",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            }
          ]
        },
        {
          "id": 489,
          "code": "B.1.33",
          "name": "其他恶性肿瘤(内)",
          "nameEn": "Other malignant neoplasms",
          "shortName": "其他恶性肿瘤(内)",
          "shortNameEn": "Other MN",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 490,
          "code": "B.1.34",
          "name": "其他非恶性肿瘤",
          "nameEn": "Other neoplasms",
          "shortName": "其他非恶性肿瘤",
          "shortNameEn": "Other Neo",
          "mostDetailed": 0,
          "level": 2,
          "children": [
            {
              "id": 964,
              "code": "B.1.34.1",
              "name": "骨髓增生异常、骨髓增生和其他造血系统肿瘤",
              "nameEn": "Myelodysplastic, myeloproliferative, and other hematopoietic neoplasms",
              "shortName": "骨髓增生异常、骨髓增生和其他造血系统肿瘤",
              "shortNameEn": "MDS+MPN",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 965,
              "code": "B.1.34.2",
              "name": "良性和原位肠肿瘤",
              "nameEn": "Benign and in situ intestinal neoplasms",
              "shortName": "良性和原位肠肿瘤",
              "shortNameEn": "Intest NMN",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 966,
              "code": "B.1.34.3",
              "name": "良性及原位宫颈及子宫肿瘤",
              "nameEn": "Benign and in situ cervical and uterine neoplasms",
              "shortName": "宫颈及子宫肿瘤",
              "shortNameEn": "Cervix NMN",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 1164,
              "code": "B.1.34.5",
              "name": "Other benign and in situ neoplasms",
              "nameEn": "Other benign and in situ neoplasms",
              "shortName": "Oth NMN",
              "shortNameEn": "Oth NMN",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            }
          ]
        }
      ]
    },
    {
      "id": 491,
      "code": "B.2",
      "name": "心血管疾病",
      "nameEn": "Cardiovascular diseases",
      "shortName": "心血管疾病",
      "shortNameEn": "CVD",
      "mostDetailed": 0,
      "level": 1,
      "children": [
        {
          "id": 492,
          "code": "B.2.1",
          "name": "风湿性心脏病",
          "nameEn": "Rheumatic heart disease",
          "shortName": "风湿性心脏病",
          "shortNameEn": "RHD",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 493,
          "code": "B.2.2",
          "name": "缺血性心脏病",
          "nameEn": "Ischemic heart disease",
          "shortName": "缺血性心脏病",
          "shortNameEn": "IHD",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 494,
          "code": "B.2.3",
          "name": "脑卒中",
          "nameEn": "Stroke",
          "shortName": "脑卒中",
          "shortNameEn": "Stroke",
          "mostDetailed": 0,
          "level": 2,
          "children": [
            {
              "id": 495,
              "code": "B.2.3.1",
              "name": "缺血性脑卒中",
              "nameEn": "Ischemic stroke",
              "shortName": "缺血性卒中",
              "shortNameEn": "Ischemic stroke",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 496,
              "code": "B.2.3.2",
              "name": "出血性脑卒中",
              "nameEn": "Intracerebral hemorrhage",
              "shortName": "出血性卒中",
              "shortNameEn": "ICH",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 497,
              "code": "B.2.3.3",
              "name": "蛛网膜下腔出血性脑卒中",
              "nameEn": "Subarachnoid hemorrhage",
              "shortName": "蛛网膜下腔出血性脑卒中",
              "shortNameEn": "SAH",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            }
          ]
        },
        {
          "id": 498,
          "code": "B.2.4",
          "name": "高血压性心脏病",
          "nameEn": "Hypertensive heart disease",
          "shortName": "高血压性心脏病",
          "shortNameEn": "HHD",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 504,
          "code": "B.2.5",
          "name": "非风湿性瓣膜病",
          "nameEn": "Non-rheumatic valvular heart disease",
          "shortName": "非风湿性瓣膜病",
          "shortNameEn": "Non-rheum valve HD",
          "mostDetailed": 0,
          "level": 2,
          "children": [
            {
              "id": 968,
              "code": "B.2.5.1",
              "name": "非风湿性钙化主动脉瓣疾病",
              "nameEn": "Non-rheumatic calcific aortic valve disease",
              "shortName": "非风湿性钙化主动脉瓣疾病",
              "shortNameEn": "CAVD",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 969,
              "code": "B.2.5.2",
              "name": "非风湿性退行性二尖瓣疾病",
              "nameEn": "Non-rheumatic degenerative mitral valve disease",
              "shortName": "非风湿性退行性二尖瓣疾病",
              "shortNameEn": "DMVD",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 970,
              "code": "B.2.5.3",
              "name": "其他非风湿性瓣膜病",
              "nameEn": "Other non-rheumatic valve diseases",
              "shortName": "其他非风湿性瓣膜病",
              "shortNameEn": "Other valvular",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            }
          ]
        },
        {
          "id": 499,
          "code": "B.2.6",
          "name": "心肌病和心肌炎",
          "nameEn": "Cardiomyopathy and myocarditis",
          "shortName": "心肌病",
          "shortNameEn": "CMP & myoc",
          "mostDetailed": 0,
          "level": 2,
          "children": [
            {
              "id": 942,
              "code": "B.2.6.1",
              "name": "心肌炎",
              "nameEn": "Myocarditis",
              "shortName": "心肌炎",
              "shortNameEn": "Myocarditis",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 938,
              "code": "B.2.6.2",
              "name": "酒精性心肌病",
              "nameEn": "Alcoholic cardiomyopathy",
              "shortName": "酒精性心肌病",
              "shortNameEn": "Alcohol CMP",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 944,
              "code": "B.2.6.3",
              "name": "其他心肌病",
              "nameEn": "Other cardiomyopathy",
              "shortName": "其他心肌病",
              "shortNameEn": "Other CMP",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            }
          ]
        },
        {
          "id": 1004,
          "code": "B.2.7",
          "name": "肺动脉高血压",
          "nameEn": "Pulmonary Arterial Hypertension",
          "shortName": "肺动脉高血压",
          "shortNameEn": "PAH",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 500,
          "code": "B.2.8",
          "name": "心房颤动-扑   ",
          "nameEn": "Atrial fibrillation and flutter",
          "shortName": "房颤",
          "shortNameEn": "Afib",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 501,
          "code": "B.2.9",
          "name": "主动脉瘤",
          "nameEn": "Aortic aneurysm",
          "shortName": "主动脉瘤",
          "shortNameEn": "Aort aneur",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 502,
          "code": "B.2.10",
          "name": "周围性血管疾病",
          "nameEn": "Lower extremity peripheral arterial disease",
          "shortName": "周围性血管疾病",
          "shortNameEn": "PAD",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 503,
          "code": "B.2.11",
          "name": "心内膜炎",
          "nameEn": "Endocarditis",
          "shortName": "心内膜炎",
          "shortNameEn": "Endocard",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 507,
          "code": "B.2.12",
          "name": "其他心血管和循环系统疾病(内)",
          "nameEn": "Other cardiovascular and circulatory diseases",
          "shortName": "其他心血管疾病(内)",
          "shortNameEn": "Other CVD",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        }
      ]
    },
    {
      "id": 508,
      "code": "B.3",
      "name": "慢性呼吸系统疾病",
      "nameEn": "Chronic respiratory diseases",
      "shortName": "慢性呼吸系统疾病",
      "shortNameEn": "Chr Resp",
      "mostDetailed": 0,
      "level": 1,
      "children": [
        {
          "id": 509,
          "code": "B.3.1",
          "name": "慢性阻塞性肺疾病",
          "nameEn": "Chronic obstructive pulmonary disease",
          "shortName": "慢阻肺",
          "shortNameEn": "COPD",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 510,
          "code": "B.3.2",
          "name": "尘肺病",
          "nameEn": "Pneumoconiosis",
          "shortName": "尘肺病",
          "shortNameEn": "Pneumocon",
          "mostDetailed": 0,
          "level": 2,
          "children": [
            {
              "id": 511,
              "code": "B.3.2.1",
              "name": "矽肺病",
              "nameEn": "Silicosis",
              "shortName": "矽肺病",
              "shortNameEn": "Silicosis",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 512,
              "code": "B.3.2.2",
              "name": "石棉肺",
              "nameEn": "Asbestosis",
              "shortName": "石棉肺",
              "shortNameEn": "Asbestosis",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 513,
              "code": "B.3.2.3",
              "name": "煤工尘肺",
              "nameEn": "Coal workers pneumoconiosis",
              "shortName": "煤工尘肺",
              "shortNameEn": "Coal W",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 514,
              "code": "B.3.2.4",
              "name": "其他尘肺病",
              "nameEn": "Other pneumoconiosis",
              "shortName": "其他尘肺病",
              "shortNameEn": "Oth Pneum",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            }
          ]
        },
        {
          "id": 515,
          "code": "B.3.3",
          "name": "哮喘",
          "nameEn": "Asthma",
          "shortName": "哮喘",
          "shortNameEn": "Asthma",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 516,
          "code": "B.3.4",
          "name": "间质性肺病和肺结节病",
          "nameEn": "Interstitial lung disease and pulmonary sarcoidosis",
          "shortName": "间质性肺病",
          "shortNameEn": "ILD",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 520,
          "code": "B.3.5",
          "name": "其他慢性呼吸系统疾病",
          "nameEn": "Other chronic respiratory diseases",
          "shortName": "其他慢性呼吸系统疾病",
          "shortNameEn": "Oth Resp",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        }
      ]
    },
    {
      "id": 526,
      "code": "B.4",
      "name": "消化系统疾病",
      "nameEn": "Digestive diseases",
      "shortName": "消化系统疾病",
      "shortNameEn": "Digestive",
      "mostDetailed": 0,
      "level": 1,
      "children": [
        {
          "id": 521,
          "code": "B.4.1",
          "name": "肝硬化",
          "nameEn": "Cirrhosis and other chronic liver diseases",
          "shortName": "肝硬化",
          "shortNameEn": "Cirrhosis liver",
          "mostDetailed": 0,
          "level": 2,
          "children": [
            {
              "id": 522,
              "code": "B.4.1.1",
              "name": "乙肝所致肝硬化",
              "nameEn": "Chronic hepatitis B including cirrhosis",
              "shortName": "乙肝致肝硬化",
              "shortNameEn": "Chronic HBV",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 523,
              "code": "B.4.1.2",
              "name": "丙肝所致肝硬化",
              "nameEn": "Chronic hepatitis C including cirrhosis",
              "shortName": "丙肝致肝硬化",
              "shortNameEn": "Chronic HCV",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 524,
              "code": "B.4.1.3",
              "name": "酒精所致肝硬化",
              "nameEn": "Cirrhosis due to alcohol",
              "shortName": "酒精致肝硬化",
              "shortNameEn": "Cirr Alc",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 971,
              "code": "B.4.1.4",
              "name": "NAFLD引起的肝硬化和其他慢性肝病",
              "nameEn": "Nonalcoholic fatty liver disease including cirrhosis",
              "shortName": "NAFLD引起的肝硬化",
              "shortNameEn": "NAFLD incl Cirr",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 525,
              "code": "B.4.1.5",
              "name": "其他原因所致肝硬化",
              "nameEn": "Cirrhosis due to other causes",
              "shortName": "其他原因肝硬",
              "shortNameEn": "Cirr Other",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            }
          ]
        },
        {
          "id": 992,
          "code": "B.4.2",
          "name": "上消化道系统疾病",
          "nameEn": "Upper digestive system diseases",
          "shortName": "上消化道系统疾病",
          "shortNameEn": "Upper Digest",
          "mostDetailed": 0,
          "level": 2,
          "children": [
            {
              "id": 527,
              "code": "B.4.2.1",
              "name": "消化性溃疡",
              "nameEn": "Peptic ulcer disease",
              "shortName": "消化性溃疡",
              "shortNameEn": "PUD",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 528,
              "code": "B.4.2.2",
              "name": "胃炎和十二指肠炎",
              "nameEn": "Gastritis and duodenitis",
              "shortName": "胃炎",
              "shortNameEn": "Gastritis",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 536,
              "code": "B.4.2.3",
              "name": "胃食管反流症",
              "nameEn": "Gastroesophageal reflux disease",
              "shortName": "胃食管反流症",
              "shortNameEn": "GERD",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            }
          ]
        },
        {
          "id": 529,
          "code": "B.4.3",
          "name": "阑尾炎",
          "nameEn": "Appendicitis",
          "shortName": "阑尾炎",
          "shortNameEn": "Appendicit",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 530,
          "code": "B.4.4",
          "name": "麻痹性肠梗阻和肠梗阻",
          "nameEn": "Paralytic ileus and intestinal obstruction",
          "shortName": "肠梗阻",
          "shortNameEn": "Ileus",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 531,
          "code": "B.4.5",
          "name": "腹股沟、股骨和腹部疝",
          "nameEn": "Inguinal, femoral, and abdominal hernia",
          "shortName": "腹部疝",
          "shortNameEn": "Hernia",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 532,
          "code": "B.4.6",
          "name": "炎症性肠病",
          "nameEn": "Inflammatory bowel disease",
          "shortName": "炎症性肠病",
          "shortNameEn": "IBD",
          "mostDetailed": 0,
          "level": 2,
          "children": [
            {
              "id": 1024,
              "code": "B.4.6.1",
              "name": "溃疡性结肠炎",
              "nameEn": "Ulcerative colitis",
              "shortName": "溃疡性结肠炎",
              "shortNameEn": "Ulcerative colitis",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 1025,
              "code": "B.4.6.2",
              "name": "克罗恩病",
              "nameEn": "Crohn's disease",
              "shortName": "克罗恩病",
              "shortNameEn": "Crohn's disease",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            }
          ]
        },
        {
          "id": 533,
          "code": "B.4.7",
          "name": "血管性肠道疾病",
          "nameEn": "Vascular intestinal disorders",
          "shortName": "血管性肠道疾病",
          "shortNameEn": "Vasc Intest",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 534,
          "code": "B.4.8",
          "name": "胆囊和胆道疾病",
          "nameEn": "Gallbladder and biliary diseases",
          "shortName": "胆囊和胆道疾病",
          "shortNameEn": "Gall Bile",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 535,
          "code": "B.4.9",
          "name": "胰腺炎",
          "nameEn": "Pancreatitis",
          "shortName": "胰腺炎",
          "shortNameEn": "Pancreatit",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 1161,
          "code": "B.4.11",
          "name": "Other digestive diseases",
          "nameEn": "Other digestive diseases",
          "shortName": "Oth Digest",
          "shortNameEn": "Oth Digest",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        }
      ]
    },
    {
      "id": 542,
      "code": "B.5",
      "name": "神经系统疾病",
      "nameEn": "Neurological disorders",
      "shortName": "神经系统疾病",
      "shortNameEn": "Neuro",
      "mostDetailed": 0,
      "level": 1,
      "children": [
        {
          "id": 543,
          "code": "B.5.1",
          "name": "阿尔茨海默病和其他痴呆",
          "nameEn": "Alzheimer's disease and other dementias",
          "shortName": "阿尔茨海默病",
          "shortNameEn": "Alzheimer's",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 544,
          "code": "B.5.2",
          "name": "帕金森",
          "nameEn": "Parkinson's disease",
          "shortName": "帕金森",
          "shortNameEn": "Parkinson's",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 545,
          "code": "B.5.3",
          "name": "癫痫",
          "nameEn": "Idiopathic epilepsy",
          "shortName": "癫痫",
          "shortNameEn": "Idiopathic epilepsy",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 546,
          "code": "B.5.4",
          "name": "多发性硬化",
          "nameEn": "Multiple sclerosis",
          "shortName": "多发性硬化",
          "shortNameEn": "MS",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 554,
          "code": "B.5.5",
          "name": "运动神经元病",
          "nameEn": "Motor neuron disease",
          "shortName": "运动神经元病",
          "shortNameEn": "ALS",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 972,
          "code": "B.5.6",
          "name": "头痛症",
          "nameEn": "Headache disorders",
          "shortName": "头痛症",
          "shortNameEn": "Headaches",
          "mostDetailed": 0,
          "level": 2,
          "children": [
            {
              "id": 547,
              "code": "B.5.6.1",
              "name": "偏头痛",
              "nameEn": "Migraine",
              "shortName": "偏头痛",
              "shortNameEn": "Migraine",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 548,
              "code": "B.5.6.2",
              "name": "紧张型头痛",
              "nameEn": "Tension-type headache",
              "shortName": "紧张头痛",
              "shortNameEn": "Tens Head",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            }
          ]
        },
        {
          "id": 557,
          "code": "B.5.7",
          "name": "其他神经系统疾病",
          "nameEn": "Other neurological disorders",
          "shortName": "其他神经系统疾病",
          "shortNameEn": "Oth Neuro",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        }
      ]
    },
    {
      "id": 558,
      "code": "B.6",
      "name": "精神障碍",
      "nameEn": "Mental disorders",
      "shortName": "精神障碍",
      "shortNameEn": "Mental",
      "mostDetailed": 0,
      "level": 1,
      "children": [
        {
          "id": 559,
          "code": "B.6.1",
          "name": "精神分裂",
          "nameEn": "Schizophrenia",
          "shortName": "精神分裂",
          "shortNameEn": "Schiz",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 567,
          "code": "B.6.2",
          "name": "抑郁症",
          "nameEn": "Depressive disorders",
          "shortName": "抑郁症",
          "shortNameEn": "Depression",
          "mostDetailed": 0,
          "level": 2,
          "children": [
            {
              "id": 568,
              "code": "B.6.2.1",
              "name": "重度抑郁症",
              "nameEn": "Major depressive disorder",
              "shortName": "重度抑郁",
              "shortNameEn": "MDD",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 569,
              "code": "B.6.2.2",
              "name": "精神抑郁",
              "nameEn": "Dysthymia",
              "shortName": "精神抑郁",
              "shortNameEn": "Dysthymia",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            }
          ]
        },
        {
          "id": 570,
          "code": "B.6.3",
          "name": "躁郁症",
          "nameEn": "Bipolar disorder",
          "shortName": "躁郁症",
          "shortNameEn": "Bipolar",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 571,
          "code": "B.6.4",
          "name": "焦虑症",
          "nameEn": "Anxiety disorders",
          "shortName": "焦虑症",
          "shortNameEn": "Anxiety",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 572,
          "code": "B.6.5",
          "name": "饮食失调",
          "nameEn": "Eating disorders",
          "shortName": "饮食失调",
          "shortNameEn": "Eating",
          "mostDetailed": 0,
          "level": 2,
          "children": [
            {
              "id": 573,
              "code": "B.6.5.1",
              "name": "神经性食欲缺乏",
              "nameEn": "Anorexia nervosa",
              "shortName": "神经性食欲缺乏",
              "shortNameEn": "Anorexia",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 574,
              "code": "B.6.5.2",
              "name": "暴食症",
              "nameEn": "Bulimia nervosa",
              "shortName": "暴食症",
              "shortNameEn": "Bulimia",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            }
          ]
        },
        {
          "id": 575,
          "code": "B.6.6",
          "name": "自闭症",
          "nameEn": "Autism spectrum disorders",
          "shortName": "自闭症",
          "shortNameEn": "ASD",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 578,
          "code": "B.6.7",
          "name": "小儿多动症",
          "nameEn": "Attention-deficit/hyperactivity disorder",
          "shortName": "小儿多动症",
          "shortNameEn": "ADHD",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 579,
          "code": "B.6.8",
          "name": "品行障碍",
          "nameEn": "Conduct disorder",
          "shortName": "品行障碍",
          "shortNameEn": "Conduct",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 582,
          "code": "B.6.9",
          "name": "先天性智力障碍",
          "nameEn": "Idiopathic developmental intellectual disability",
          "shortName": "先天性智力障碍",
          "shortNameEn": "ID",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 585,
          "code": "B.6.10",
          "name": "其他精神障碍",
          "nameEn": "Other mental disorders",
          "shortName": "其他精神障碍",
          "shortNameEn": "Oth Ment",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        }
      ]
    },
    {
      "id": 973,
      "code": "B.7",
      "name": "物质使用障碍",
      "nameEn": "Substance use disorders",
      "shortName": "物质使用障碍",
      "shortNameEn": "Subs Use",
      "mostDetailed": 0,
      "level": 1,
      "children": [
        {
          "id": 560,
          "code": "B.7.1",
          "name": "酒精使用障碍",
          "nameEn": "Alcohol use disorders",
          "shortName": "酒精使用障碍",
          "shortNameEn": "Alcohol",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 561,
          "code": "B.7.2",
          "name": "药物使用障碍",
          "nameEn": "Drug use disorders",
          "shortName": "药物使用障碍",
          "shortNameEn": "Drugs",
          "mostDetailed": 0,
          "level": 2,
          "children": [
            {
              "id": 562,
              "code": "B.7.2.1",
              "name": "阿片类使用障碍",
              "nameEn": "Opioid use disorders",
              "shortName": "阿片类使用障碍",
              "shortNameEn": "Opioids",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 563,
              "code": "B.7.2.2",
              "name": "可卡因使用障碍",
              "nameEn": "Cocaine use disorders",
              "shortName": "可卡因使用障碍",
              "shortNameEn": "Cocaine",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 564,
              "code": "B.7.2.3",
              "name": "安非他明的使用障碍",
              "nameEn": "Amphetamine use disorders",
              "shortName": "安非他明的使用障碍",
              "shortNameEn": "Amphet",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 565,
              "code": "B.7.2.4",
              "name": "大麻使用障碍",
              "nameEn": "Cannabis use disorders",
              "shortName": "大麻使用障碍",
              "shortNameEn": "Cannabis",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 566,
              "code": "B.7.2.5",
              "name": "其他药物使用障碍",
              "nameEn": "Other drug use disorders",
              "shortName": "其他药物使用障碍",
              "shortNameEn": "Oth Drug",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            }
          ]
        }
      ]
    },
    {
      "id": 974,
      "code": "B.8",
      "name": "糖尿病和肾病",
      "nameEn": "Diabetes and kidney diseases",
      "shortName": "糖尿病和肾病",
      "shortNameEn": "Diabetes+CKD",
      "mostDetailed": 0,
      "level": 1,
      "children": [
        {
          "id": 587,
          "code": "B.8.1",
          "name": "糖尿病",
          "nameEn": "Diabetes mellitus",
          "shortName": "糖尿病",
          "shortNameEn": "Diabetes",
          "mostDetailed": 0,
          "level": 2,
          "children": [
            {
              "id": 975,
              "code": "B.8.1.1",
              "name": "1型糖尿病",
              "nameEn": "Diabetes mellitus type 1",
              "shortName": "1型糖尿病",
              "shortNameEn": "Diabetes 1",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 976,
              "code": "B.8.1.2",
              "name": "2型糖尿病",
              "nameEn": "Diabetes mellitus type 2",
              "shortName": "2型糖尿病",
              "shortNameEn": "Diabetes 2",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            }
          ]
        },
        {
          "id": 589,
          "code": "B.8.2",
          "name": "慢性肾疾病",
          "nameEn": "Chronic kidney disease",
          "shortName": "慢性肾疾病",
          "shortNameEn": "CKD",
          "mostDetailed": 0,
          "level": 2,
          "children": [
            {
              "id": 997,
              "code": "B.8.2.1",
              "name": "1型糖尿病引起的慢性肾病",
              "nameEn": "Chronic kidney disease due to diabetes mellitus type 1",
              "shortName": "慢性肾病1型糖尿病",
              "shortNameEn": "CKD Diabetes1",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 998,
              "code": "B.8.2.2",
              "name": "2型糖尿病引起的慢性肾病",
              "nameEn": "Chronic kidney disease due to diabetes mellitus type 2",
              "shortName": "慢性肾病2型糖尿病",
              "shortNameEn": "CKD Diabetes2",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 591,
              "code": "B.8.2.3",
              "name": "高血压致慢性肾疾病",
              "nameEn": "Chronic kidney disease due to hypertension",
              "shortName": "高血压致慢性肾疾病",
              "shortNameEn": "HTN CKD",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 592,
              "code": "B.8.2.4",
              "name": "肾小球肾炎致慢性肾疾病",
              "nameEn": "Chronic kidney disease due to glomerulonephritis",
              "shortName": "肾小球肾炎致慢性肾疾病",
              "shortNameEn": "GN CKD",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 593,
              "code": "B.8.2.5",
              "name": "其他原因致慢性肾疾病",
              "nameEn": "Chronic kidney disease due to other and unspecified causes",
              "shortName": "其他原因致慢性肾疾病",
              "shortNameEn": "Oth CKD",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            }
          ]
        },
        {
          "id": 588,
          "code": "B.8.3",
          "name": "急性肾小球肾炎",
          "nameEn": "Acute glomerulonephritis",
          "shortName": "急性肾小球肾炎",
          "shortNameEn": "AGN",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        }
      ]
    },
    {
      "id": 653,
      "code": "B.9",
      "name": "皮肤和皮下疾病",
      "nameEn": "Skin and subcutaneous diseases",
      "shortName": "皮肤病",
      "shortNameEn": "Skin",
      "mostDetailed": 0,
      "level": 1,
      "children": [
        {
          "id": 654,
          "code": "B.9.1",
          "name": "皮炎",
          "nameEn": "Dermatitis",
          "shortName": "皮炎",
          "shortNameEn": "Dermatitis",
          "mostDetailed": 0,
          "level": 2,
          "children": [
            {
              "id": 977,
              "code": "B.9.1.1",
              "name": "过敏性皮肤炎",
              "nameEn": "Atopic dermatitis",
              "shortName": "过敏性皮肤炎",
              "shortNameEn": "Atopic Derm",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 978,
              "code": "B.9.1.2",
              "name": "接触性皮肤炎",
              "nameEn": "Contact dermatitis",
              "shortName": "接触性皮肤炎",
              "shortNameEn": "Contact Derm",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 979,
              "code": "B.9.1.3",
              "name": "脂溢性皮炎",
              "nameEn": "Seborrhoeic dermatitis",
              "shortName": "脂溢性皮炎",
              "shortNameEn": "Seborr Derm",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            }
          ]
        },
        {
          "id": 655,
          "code": "B.9.2",
          "name": "牛皮癣",
          "nameEn": "Psoriasis",
          "shortName": "牛皮癣",
          "shortNameEn": "Psoriasis",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 980,
          "code": "B.9.3",
          "name": "细菌性皮肤疾病",
          "nameEn": "Bacterial skin diseases",
          "shortName": "细菌性皮肤病",
          "shortNameEn": "Bac Skin",
          "mostDetailed": 0,
          "level": 2,
          "children": [
            {
              "id": 656,
              "code": "B.9.3.1",
              "name": "蜂窝组织炎",
              "nameEn": "Cellulitis",
              "shortName": "蜂窝组织炎",
              "shortNameEn": "Cellulitis",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 657,
              "code": "B.9.3.2",
              "name": "脓皮病",
              "nameEn": "Pyoderma",
              "shortName": "脓皮病",
              "shortNameEn": "Pyoderma",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            }
          ]
        },
        {
          "id": 658,
          "code": "B.9.4",
          "name": "疥疮",
          "nameEn": "Scabies",
          "shortName": "疥疮",
          "shortNameEn": "Scabies",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 659,
          "code": "B.9.5",
          "name": "真菌性皮肤病",
          "nameEn": "Fungal skin diseases",
          "shortName": "真菌性皮肤病",
          "shortNameEn": "Skin Fung",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 660,
          "code": "B.9.6",
          "name": "病毒性皮肤病",
          "nameEn": "Viral skin diseases",
          "shortName": "病毒性皮肤病",
          "shortNameEn": "Skin Viral",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 661,
          "code": "B.9.7",
          "name": "痤疮",
          "nameEn": "Acne vulgaris",
          "shortName": "痤疮",
          "shortNameEn": "Acne",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 662,
          "code": "B.9.8",
          "name": "斑秃",
          "nameEn": "Alopecia areata",
          "shortName": "斑秃",
          "shortNameEn": "Alopecia",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 663,
          "code": "B.9.9",
          "name": "瘙痒",
          "nameEn": "Pruritus",
          "shortName": "瘙痒",
          "shortNameEn": "Pruritus",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 664,
          "code": "B.9.10",
          "name": "荨麻疹",
          "nameEn": "Urticaria",
          "shortName": "荨麻疹",
          "shortNameEn": "Urticaria",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 665,
          "code": "B.9.11",
          "name": "褥疮",
          "nameEn": "Decubitus ulcer",
          "shortName": "褥疮",
          "shortNameEn": "Decubitus",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 668,
          "code": "B.9.12",
          "name": "其他皮肤和皮下疾病",
          "nameEn": "Other skin and subcutaneous diseases",
          "shortName": "其他皮肤病",
          "shortNameEn": "Oth Skin",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        }
      ]
    },
    {
      "id": 669,
      "code": "B.10",
      "name": "感觉器官疾病",
      "nameEn": "Sense organ diseases",
      "shortName": "感觉器官疾病",
      "shortNameEn": "Sense",
      "mostDetailed": 0,
      "level": 1,
      "children": [
        {
          "id": 981,
          "code": "B.10.1",
          "name": "失明和视力缺失",
          "nameEn": "Blindness and vision loss",
          "shortName": "失明",
          "shortNameEn": "Blindness",
          "mostDetailed": 0,
          "level": 2,
          "children": [
            {
              "id": 670,
              "code": "B.10.1.1",
              "name": "青光眼",
              "nameEn": "Glaucoma",
              "shortName": "青光眼",
              "shortNameEn": "Glaucoma",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 671,
              "code": "B.10.1.2",
              "name": "白内障",
              "nameEn": "Cataract",
              "shortName": "白内障",
              "shortNameEn": "Cataract",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 672,
              "code": "B.10.1.3",
              "name": "年龄相关性黄斑变性",
              "nameEn": "Age-related macular degeneration",
              "shortName": "黄斑变性",
              "shortNameEn": "Macular",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 999,
              "code": "B.10.1.4",
              "name": "屈光障碍",
              "nameEn": "Refraction disorders",
              "shortName": "屈光障碍",
              "shortNameEn": "Refraction",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 1000,
              "code": "B.10.1.5",
              "name": "近视力丧失",
              "nameEn": "Near vision loss",
              "shortName": "近视",
              "shortNameEn": "Near vision",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 1162,
              "code": "B.10.1.7",
              "name": "Other vision loss",
              "nameEn": "Other vision loss",
              "shortName": "Oth Vision",
              "shortNameEn": "Oth Vision",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            }
          ]
        },
        {
          "id": 674,
          "code": "B.10.2",
          "name": "年龄相关和其他原因听力损失",
          "nameEn": "Age-related and other hearing loss",
          "shortName": "听力损失",
          "shortNameEn": "Hearing",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 679,
          "code": "B.10.3",
          "name": "其他感官疾病",
          "nameEn": "Other sense organ diseases",
          "shortName": "其他感官疾病",
          "shortNameEn": "Oth Sense",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        }
      ]
    },
    {
      "id": 626,
      "code": "B.11",
      "name": "肌肉骨骼疾病",
      "nameEn": "Musculoskeletal disorders",
      "shortName": "肌肉骨骼疾病",
      "shortNameEn": "MSK",
      "mostDetailed": 0,
      "level": 1,
      "children": [
        {
          "id": 627,
          "code": "B.11.1",
          "name": "风湿性关节炎",
          "nameEn": "Rheumatoid arthritis",
          "shortName": "风湿性关节炎",
          "shortNameEn": "Rheu Arth",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 628,
          "code": "B.11.2",
          "name": "骨关节炎",
          "nameEn": "Osteoarthritis",
          "shortName": "骨关节炎",
          "shortNameEn": "Osteoarth",
          "mostDetailed": 0,
          "level": 2,
          "children": [
            {
              "id": 1014,
              "code": "B.11.2.1",
              "name": "髋关节骨性关节炎",
              "nameEn": "Osteoarthritis hip",
              "shortName": "髋关节骨性关节炎",
              "shortNameEn": "Osteoarth Hip",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 1015,
              "code": "B.11.2.2",
              "name": "膝关节骨性关节炎",
              "nameEn": "Osteoarthritis knee",
              "shortName": "膝关节骨性关节炎",
              "shortNameEn": "Osteoarth Knee",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 1016,
              "code": "B.11.2.3",
              "name": "手部骨关节炎",
              "nameEn": "Osteoarthritis hand",
              "shortName": "手部骨关节炎",
              "shortNameEn": "Osteoarth Hand",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 1017,
              "code": "B.11.2.4",
              "name": "其他骨关节炎",
              "nameEn": "Osteoarthritis other",
              "shortName": "其他骨关节炎",
              "shortNameEn": "Osteoarth Oth",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            }
          ]
        },
        {
          "id": 630,
          "code": "B.11.3",
          "name": "下背痛",
          "nameEn": "Low back pain",
          "shortName": "下背痛",
          "shortNameEn": "Back Pain",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 631,
          "code": "B.11.4",
          "name": "颈痛",
          "nameEn": "Neck pain",
          "shortName": "颈痛",
          "shortNameEn": "Neck Pain",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 632,
          "code": "B.11.5",
          "name": "痛风",
          "nameEn": "Gout",
          "shortName": "痛风",
          "shortNameEn": "Gout",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        },
        {
          "id": 639,
          "code": "B.11.6",
          "name": "其他肌肉骨骼疾病",
          "nameEn": "Other musculoskeletal disorders",
          "shortName": "其他肌肉骨骼疾病",
          "shortNameEn": "Oth MSK",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        }
      ]
    },
    {
      "id": 640,
      "code": "B.12",
      "name": "其他非传染性疾病",
      "nameEn": "Other non-communicable diseases",
      "shortName": "其他非传染性疾病",
      "shortNameEn": "Oth NCD",
      "mostDetailed": 0,
      "level": 1,
      "children": [
        {
          "id": 641,
          "code": "B.12.1",
          "name": "先天畸形",
          "nameEn": "Congenital birth defects",
          "shortName": "先天畸形",
          "shortNameEn": "Congenital",
          "mostDetailed": 0,
          "level": 2,
          "children": [
            {
              "id": 642,
              "code": "B.12.1.1",
              "name": "神经管缺陷",
              "nameEn": "Neural tube defects",
              "shortName": "神经管缺陷",
              "shortNameEn": "Neur Tube",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 643,
              "code": "B.12.1.2",
              "name": "先天性心脏异常",
              "nameEn": "Congenital heart anomalies",
              "shortName": "先心病",
              "shortNameEn": "Cong Heart",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 644,
              "code": "B.12.1.3",
              "name": "唇腭裂",
              "nameEn": "Orofacial clefts",
              "shortName": "唇裂",
              "shortNameEn": "Cleft",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 645,
              "code": "B.12.1.4",
              "name": "唐氏综合征",
              "nameEn": "Down syndrome",
              "shortName": "唐氏综合征",
              "shortNameEn": "Down",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 646,
              "code": "B.12.1.5",
              "name": "特纳综合征",
              "nameEn": "Turner syndrome",
              "shortName": "特纳综合征",
              "shortNameEn": "Turner",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 647,
              "code": "B.12.1.6",
              "name": "克兰费尔特综合征",
              "nameEn": "Klinefelter syndrome",
              "shortName": "克兰费尔特综合征",
              "shortNameEn": "Klinefelter",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 648,
              "code": "B.12.1.7",
              "name": "染色体不平衡重组",
              "nameEn": "Other chromosomal abnormalities",
              "shortName": "染色体不平衡重组",
              "shortNameEn": "Chrom Unb",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 649,
              "code": "B.12.1.8",
              "name": "先天性肌肉骨骼和肢体畸形",
              "nameEn": "Congenital musculoskeletal and limb anomalies",
              "shortName": "先天性肌肉骨骼和肢体畸形",
              "shortNameEn": "Cong MSK",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 650,
              "code": "B.12.1.9",
              "name": "泌尿生殖系统先天性畸形",
              "nameEn": "Urogenital congenital anomalies",
              "shortName": "泌尿生殖系统先天性畸形",
              "shortNameEn": "Cong Urogen",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 651,
              "code": "B.12.1.10",
              "name": "消化道先天性畸形",
              "nameEn": "Digestive congenital anomalies",
              "shortName": "消化道先天性畸形",
              "shortNameEn": "Digest Anom",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 652,
              "code": "B.12.1.11",
              "name": "其他先天异常",
              "nameEn": "Other congenital birth defects",
              "shortName": "其他先天异常",
              "shortNameEn": "Oth Cong",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            }
          ]
        },
        {
          "id": 594,
          "code": "B.12.2",
          "name": "泌尿系统疾病和男性不孕症",
          "nameEn": "Urinary diseases and male infertility",
          "shortName": "泌尿系统疾病",
          "shortNameEn": "Urinary",
          "mostDetailed": 0,
          "level": 2,
          "children": [
            {
              "id": 595,
              "code": "B.12.2.1",
              "name": "尿路感染",
              "nameEn": "Urinary tract infections and interstitial nephritis",
              "shortName": "尿路感染",
              "shortNameEn": "UTI and interstitial nephritis",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 596,
              "code": "B.12.2.2",
              "name": "尿石症",
              "nameEn": "Urolithiasis",
              "shortName": "尿石症",
              "shortNameEn": "Urolith",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 597,
              "code": "B.12.2.3",
              "name": "良性前列腺增生",
              "nameEn": "Benign prostatic hyperplasia",
              "shortName": "良性前列腺增生",
              "shortNameEn": "BPH",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 598,
              "code": "B.12.2.4",
              "name": "其他原因所致男性不孕症",
              "nameEn": "Male infertility",
              "shortName": "男性不孕症",
              "shortNameEn": "Infert M",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 602,
              "code": "B.12.2.5",
              "name": "其他泌尿系统疾病",
              "nameEn": "Other urinary diseases",
              "shortName": "其他泌尿系统疾病",
              "shortNameEn": "Oth Urin",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            }
          ]
        },
        {
          "id": 603,
          "code": "B.12.3",
          "name": "妇科疾病",
          "nameEn": "Gynecological diseases",
          "shortName": "妇科疾病",
          "shortNameEn": "Gyne",
          "mostDetailed": 0,
          "level": 2,
          "children": [
            {
              "id": 604,
              "code": "B.12.3.1",
              "name": "子宫纤维瘤",
              "nameEn": "Uterine fibroids",
              "shortName": "子宫纤维瘤",
              "shortNameEn": "Fibroids",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 605,
              "code": "B.12.3.2",
              "name": "多囊卵巢综合征",
              "nameEn": "Polycystic ovarian syndrome",
              "shortName": "多囊卵巢综合征",
              "shortNameEn": "PCOS",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 606,
              "code": "B.12.3.3",
              "name": "其他原因所致女性不孕症",
              "nameEn": "Female infertility",
              "shortName": "女性不孕症",
              "shortNameEn": "Infert F",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 607,
              "code": "B.12.3.4",
              "name": "子宫内膜异位",
              "nameEn": "Endometriosis",
              "shortName": "子宫内膜异位",
              "shortNameEn": "Endomet",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 608,
              "code": "B.12.3.5",
              "name": "子宫脱垂",
              "nameEn": "Genital prolapse",
              "shortName": "子宫脱垂",
              "shortNameEn": "Prolapse",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 609,
              "code": "B.12.3.6",
              "name": "经前期综合征",
              "nameEn": "Premenstrual syndrome",
              "shortName": "经前期综合征",
              "shortNameEn": "PMS",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 612,
              "code": "B.12.3.7",
              "name": "其他妇科疾病",
              "nameEn": "Other gynecological diseases",
              "shortName": "其他妇科疾病",
              "shortNameEn": "Oth Gyne",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            }
          ]
        },
        {
          "id": 613,
          "code": "B.12.4",
          "name": "血红蛋白病和溶血性贫血",
          "nameEn": "Hemoglobinopathies and hemolytic anemias",
          "shortName": "血红蛋白病",
          "shortNameEn": "Hemog",
          "mostDetailed": 0,
          "level": 2,
          "children": [
            {
              "id": 614,
              "code": "B.12.4.1",
              "name": "地中海贫血",
              "nameEn": "Thalassemias",
              "shortName": "地中海贫血",
              "shortNameEn": "Thalass",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 837,
              "code": "B.12.4.2",
              "name": "地中海型贫血",
              "nameEn": "Thalassemias trait",
              "shortName": "地中海型贫血",
              "shortNameEn": "Thalass Trait",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 615,
              "code": "B.12.4.3",
              "name": "镰状细胞病",
              "nameEn": "Sickle cell disorders",
              "shortName": "镰状细胞病",
              "shortNameEn": "Sickle",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 838,
              "code": "B.12.4.4",
              "name": "镰刀型贫血",
              "nameEn": "Sickle cell trait",
              "shortName": "镰刀型贫血",
              "shortNameEn": "Sickle Trait",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 616,
              "code": "B.12.4.5",
              "name": "遗传性葡萄糖-6-磷酸脱氢酶缺乏症遗传性葡萄糖",
              "nameEn": "G6PD deficiency",
              "shortName": "G6PD缺乏症",
              "shortNameEn": "G6PD",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 839,
              "code": "B.12.4.6",
              "name": "葡萄糖-6-磷酸脱氢酶特性葡萄糖",
              "nameEn": "G6PD trait",
              "shortName": "G6PD Trait",
              "shortNameEn": "G6PD Trait",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 618,
              "code": "B.12.4.7",
              "name": "其他血红蛋白病和溶血性贫血",
              "nameEn": "Other hemoglobinopathies and hemolytic anemias",
              "shortName": "其他血红蛋白病",
              "shortNameEn": "Oth Hem",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            }
          ]
        },
        {
          "id": 619,
          "code": "B.12.5",
          "name": "内分泌，新陈代谢，血液，免疫系统疾病",
          "nameEn": "Endocrine, metabolic, blood, and immune disorders",
          "shortName": "内分泌系统疾病",
          "shortNameEn": "Endocrine",
          "mostDetailed": 0,
          "level": 2,
          "children": [
            {
              "id": 1032,
              "code": "B.12.5.1",
              "name": "甲状腺疾病",
              "nameEn": "Thyroid diseases",
              "shortName": "甲状腺疾病",
              "shortNameEn": "Thyroid diseases",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 625,
              "code": "B.12.5.2",
              "name": "其他内分泌、代谢、血液和免疫紊乱",
              "nameEn": "Other endocrine, metabolic, blood, and immune disorders",
              "shortName": "其他内分泌、代谢、血液和免疫紊乱",
              "shortNameEn": "Other Endo",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            }
          ]
        },
        {
          "id": 680,
          "code": "B.12.6",
          "name": "口腔疾病",
          "nameEn": "Oral disorders",
          "shortName": "口腔疾病",
          "shortNameEn": "Oral",
          "mostDetailed": 0,
          "level": 2,
          "children": [
            {
              "id": 681,
              "code": "B.12.6.1",
              "name": "乳牙龋齿",
              "nameEn": "Caries of deciduous teeth",
              "shortName": "乳牙龋齿",
              "shortNameEn": "Dec Caries",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 682,
              "code": "B.12.6.2",
              "name": "恒牙龋齿",
              "nameEn": "Caries of permanent teeth",
              "shortName": "恒牙龋齿",
              "shortNameEn": "Per Caries",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 683,
              "code": "B.12.6.3",
              "name": "牙周病",
              "nameEn": "Periodontal diseases",
              "shortName": "牙周病",
              "shortNameEn": "Period",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 684,
              "code": "B.12.6.4",
              "name": "无齿和严重牙齿脱落",
              "nameEn": "Edentulism",
              "shortName": "无齿",
              "shortNameEn": "Edentul",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            },
            {
              "id": 685,
              "code": "B.12.6.5",
              "name": "其他口腔疾病",
              "nameEn": "Other oral disorders",
              "shortName": "其他口腔疾病",
              "shortNameEn": "Other Oral",
              "mostDetailed": 1,
              "level": 3,
              "children": []
            }
          ]
        },
        {
          "id": 686,
          "code": "B.12.7",
          "name": "婴儿猝死综合征",
          "nameEn": "Sudden infant death syndrome",
          "shortName": "婴儿猝死综合征",
          "shortNameEn": "SIDS",
          "mostDetailed": 1,
          "level": 2,
          "children": []
        }
      ]
    }
  ]
} as const;

export const GBD_CHRONIC_DISEASE_TREE: GbdChronicDiseaseNode[] = GBD_CHRONIC_DISEASE_ROOT.children;
