import { Link } from 'react-router-dom';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  ArrowRight,
  UserPlus,
  Brain,
  Users,
  BarChart3,
  Zap,
  Clock,
  Shield,
  Target,
  TrendingUp,
  FileSearch,
  MessageSquare,
  PieChart,
} from 'lucide-react';

const serviceDetails = [
  {
    id: 'onboarding',
    icon: UserPlus,
    title: 'Onboarding New Talent',
    tagline: 'Faster ramp-up, confident new hires',
    description: 'A streamlined onboarding service that accelerates ramp-up time for new hires while increasing new-employee confidence by delivering clear, role-specific knowledge and guidance from day one.',
    features: [
      'Role-specific knowledge pathways',
      'Interactive onboarding checklists',
      'Department-tailored training content',
      'Progress tracking and milestones',
      'Manager visibility into onboarding status',
      'Instant answers to common new-hire questions',
    ],
    benefits: [
      { metric: '40%', label: 'Faster onboarding' },
      { metric: '3x', label: 'New hire confidence' },
    ],
    color: 'bg-emerald-500/10 text-emerald-600',
  },
  {
    id: 'knowledge-vault',
    icon: Brain,
    title: 'AI Knowledge Vault',
    tagline: 'Your all-knowing internal AI',
    description: 'An all-knowing internal AI that instantly answers employee questions by securely accessing and understanding the organization\'s complete internal knowledge base.',
    features: [
      'Natural language question answering',
      'Secure access to all internal documents',
      'Source citations for every answer',
      'Context-aware responses',
      'Multi-format document support',
      '24/7 availability for your workforce',
    ],
    benefits: [
      { metric: '80%', label: 'Faster answers' },
      { metric: '95%', label: 'Answer accuracy' },
    ],
    color: 'bg-blue-500/10 text-blue-600',
  },
  {
    id: 'expert-onboarding',
    icon: Users,
    title: 'Expert Team Onboarding',
    tagline: 'We do the heavy lifting',
    description: 'A hands-on service where our experts capture, structure, and implement a company\'s internal knowledge directly into the AI, ensuring accuracy, completeness, and fast deployment.',
    features: [
      'Dedicated knowledge engineers',
      'Complete knowledge audit and inventory',
      'Document structuring and tagging',
      'Quality assurance and validation',
      'Admin training and handoff',
      '8-week production-ready deployment',
    ],
    benefits: [
      { metric: '8 weeks', label: 'To production' },
      { metric: '100%', label: 'Coverage audit' },
    ],
    color: 'bg-purple-500/10 text-purple-600',
  },
  {
    id: 'analytics',
    icon: BarChart3,
    title: 'Employee Knowledge Analytics',
    tagline: 'Data-driven knowledge insights',
    description: 'A powerful analytics service that tracks, measures, and visualizes employee knowledge usage and behavior, providing actionable, data-driven insights to improve performance and operational decision-making.',
    features: [
      'Real-time usage dashboards',
      'Knowledge gap identification',
      'Department-level breakdowns',
      'Trend analysis and forecasting',
      'Custom report generation',
      'Actionable recommendations',
    ],
    benefits: [
      { metric: '100%', label: 'Visibility' },
      { metric: 'Real-time', label: 'Insights' },
    ],
    color: 'bg-amber-500/10 text-amber-600',
  },
];

const processSteps = [
  {
    icon: MessageSquare,
    title: 'Consultation',
    description: 'We assess your knowledge landscape and identify key opportunities.',
  },
  {
    icon: FileSearch,
    title: 'Audit & Discovery',
    description: 'Our experts inventory and evaluate your existing knowledge assets.',
  },
  {
    icon: Shield,
    title: 'Implementation',
    description: 'We structure, ingest, and validate your knowledge in the AI vault.',
  },
  {
    icon: TrendingUp,
    title: 'Launch & Optimize',
    description: 'Go live with training, then continuously improve with analytics.',
  },
];

export default function Services() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative overflow-hidden py-20 md:py-28">
        <div className="gradient-hero absolute inset-0 opacity-5" />
        <div className="container relative mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="mb-4 bg-accent/10 text-accent">
              Our Services
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
              Four services to{' '}
              <span className="text-accent">unlock your knowledge</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              End-to-end solutions for capturing, organizing, accessing, and measuring 
              your organization's internal knowledge.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link to="/booking">
                <Button size="lg" className="bg-accent hover:bg-accent/90">
                  Schedule Consultation
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/about">
                <Button size="lg" variant="outline">
                  Learn About Us
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Services Detail Sections */}
      {serviceDetails.map((service, index) => (
        <section
          key={service.id}
          id={service.id}
          className={`py-20 ${index % 2 === 0 ? 'bg-muted/30' : ''}`}
        >
          <div className="container mx-auto px-4">
            <div className={`grid gap-12 lg:grid-cols-2 lg:items-center ${index % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}>
              <div className={index % 2 === 1 ? 'lg:order-2' : ''}>
                <div className={`mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl ${service.color}`}>
                  <service.icon className="h-7 w-7" />
                </div>
                <h2 className="text-3xl font-bold text-foreground md:text-4xl">
                  {service.title}
                </h2>
                <p className="mt-2 text-lg font-medium text-accent">
                  {service.tagline}
                </p>
                <p className="mt-4 text-muted-foreground">
                  {service.description}
                </p>
                <ul className="mt-8 space-y-3">
                  {service.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-success" />
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  <Link to="/booking">
                    <Button className="bg-accent hover:bg-accent/90">
                      Get Started
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
              <div className={`grid gap-4 sm:grid-cols-2 ${index % 2 === 1 ? 'lg:order-1' : ''}`}>
                {service.benefits.map((benefit, i) => (
                  <Card key={i} className={i === 0 ? 'bg-accent text-accent-foreground' : ''}>
                    <CardContent className="pt-6">
                      {i === 0 ? (
                        <Zap className="h-8 w-8" />
                      ) : (
                        <Clock className="h-8 w-8 text-accent" />
                      )}
                      <div className="mt-4 text-3xl font-bold">{benefit.metric}</div>
                      <p className={`mt-1 ${i === 0 ? 'text-accent-foreground/80' : 'text-muted-foreground'}`}>
                        {benefit.label}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* Process Section */}
      <section className="border-t bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-foreground md:text-4xl">
              How We Work
            </h2>
            <p className="mt-4 text-muted-foreground">
              A proven process from discovery to deployment
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {processSteps.map((step, index) => (
              <Card key={step.title} className="relative">
                <CardContent className="pt-6">
                  <div className="absolute -top-3 left-6 flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-foreground font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                    <step.icon className="h-6 w-6 text-accent" />
                  </div>
                  <h3 className="font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl rounded-2xl bg-accent p-8 text-center md:p-12">
            <h2 className="text-3xl font-bold text-accent-foreground md:text-4xl">
              Ready to get started?
            </h2>
            <p className="mt-4 text-accent-foreground/80">
              Schedule a free consultation to discuss your knowledge management needs 
              and learn how our services can help your organization.
            </p>
            <div className="mt-8">
              <Link to="/booking">
                <Button
                  size="lg"
                  variant="secondary"
                  className="bg-background text-foreground hover:bg-background/90"
                >
                  Book a Free Consultation
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
