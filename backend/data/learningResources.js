/**
 * Catalog of curated learning resources indexed by skill name.
 * We intentionally keep this local (no DB schema changes).
 */
const learningResourcesCatalog = [
  {
    skillName: "AWS SageMaker",
    provider: "AWS Skill Builder",
    title: "Amazon SageMaker Studio Workshop",
    url: "https://catalog.us-east-1.prod.workshops.aws/workshops/2b7fd5df-3913-4bcb-ae44-9779eb544d18",
    estimatedHours: 4,
    level: "Intermediate",
    tags: ["Machine Learning", "AWS"],
  },
  {
    skillName: "AWS Bedrock",
    provider: "Coursera",
    title: "Generative AI with Large Language Models on AWS",
    url: "https://www.coursera.org/learn/generative-ai-with-llms-on-aws",
    estimatedHours: 8,
    level: "Intermediate",
    tags: ["Generative AI", "AWS"],
  },
  {
    skillName: "Explainable AI",
    provider: "edX",
    title: "Principles of Explainable AI",
    url: "https://www.edx.org/course/principles-of-explainable-ai",
    estimatedHours: 6,
    level: "Intermediate",
    tags: ["Responsible AI", "Ethics"],
  },
  {
    skillName: "Responsible AI",
    provider: "DeepLearning.AI",
    title: "AI Ethics and Governance",
    url: "https://www.deeplearning.ai/courses/ai-ethics-and-governance/",
    estimatedHours: 5,
    level: "Intermediate",
    tags: ["Responsible AI", "Governance"],
  },
  {
    skillName: "Kubernetes",
    provider: "LinkedIn Learning",
    title: "Learning Kubernetes",
    url: "https://www.linkedin.com/learning/learning-kubernetes-2",
    estimatedHours: 3,
    level: "Beginner",
    tags: ["DevOps", "Cloud"],
  },
  {
    skillName: "Azure DevOps",
    provider: "Microsoft Learn",
    title: "Architect modern applications in Azure",
    url: "https://learn.microsoft.com/en-us/training/paths/architect-modern-apps-azure/",
    estimatedHours: 7,
    level: "Intermediate",
    tags: ["Azure", "Architecture"],
  },
  {
    skillName: "MLOps",
    provider: "Coursera",
    title: "MLOps | Machine Learning Operations",
    url: "https://www.coursera.org/specializations/mlops-machine-learning",
    estimatedHours: 10,
    level: "Advanced",
    tags: ["MLOps", "ML Engineering"],
  },
  {
    skillName: "AWS Control Tower",
    provider: "AWS Skill Builder",
    title: "AWS Control Tower – Landing Zone Accelerator",
    url: "https://explore.skillbuilder.aws/learn/course/external/view/elearning/13134/aws-control-tower",
    estimatedHours: 2,
    level: "Intermediate",
    tags: ["Cloud Governance", "AWS"],
  },
  {
    skillName: "TensorFlow",
    provider: "Coursera",
    title: "Advanced Machine Learning with TensorFlow on Google Cloud",
    url: "https://www.coursera.org/specializations/advanced-machine-learning-tensorflow-gcp",
    estimatedHours: 12,
    level: "Advanced",
    tags: ["Machine Learning", "Google Cloud"],
  },
];

/**
 * Simple synonym map to improve matching between job descriptions and catalog skills.
 */
const skillSynonyms = {
  "generative ai": ["llm", "large language model", "gpt", "bedrock"],
  "responsible ai": ["ethical ai", "ai ethics"],
  kubernetes: ["k8s"],
  "azure devops": ["azure pipelines", "azure ci/cd"],
  "aws control tower": ["landing zone"],
};

export { learningResourcesCatalog, skillSynonyms };

