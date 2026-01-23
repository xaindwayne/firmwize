import { Link } from 'react-router-dom';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  ArrowRight,
  Users,
  FileText,
  Target,
  Shield,
  Clock,
  Award,
  Zap,
  BarChart3,
} from 'lucide-react';

const phases = [
  {
    week: 'Week 1-2',
    title: 'Discovery & Audit',
    description: 'Deep dive into your existing knowledge assets, processes, and organizational structure.',
    tasks: [
      'Knowledge inventory assessment',
      'Gap analysis with stakeholders',
      'Define success metrics',
      'Create implementation roadmap',
    ],
  },
  {
    week: 'Week 3-4',
    title: 'Structure & Organize',
    description: 'Build the foundation for your AI-ready knowledge base.',
    tasks: [
      'Design category taxonomy',
      'Set up governance workflows',
      'Configure access controls',
      'Establish naming conventions',
    ],
  },
  {
    week: 'Week 5-6',
    title: 'Ingest & Process',
    description: 'Migrate and process your existing documents into the knowledge vault.',
    tasks: [
      'Bulk document upload',
      'Content extraction & indexing',
      'Quality assurance review',
      'AI training validation',
    ],
  },
  {
    week: 'Week 7-8',
    title: 'Launch & Train',
    description: 'Go live with your AI knowledge assistant and train your team.',
    tasks: [
      'Admin training sessions',
      'Employee onboarding',
      'Pilot program launch',
      'Performance optimization',
    ],
  },
];

const deliverables = [
  {
    icon: FileText,
    title: 'Structured Knowledge Base',
    description: 'Fully organized document repository with proper categorization and metadata.',
  },
  {
    icon: Shield,
    title: 'Governance Framework',
    description: 'Approval workflows, version control, and access policies configured and documented.',
  },
  {
    icon: Target,
    title: 'AI Readiness Report',
    description: 'Coverage analysis, quality scores, and recommendations for continuous improvement.',
  },
  {
    icon: Users,
    title: 'Trained Admin Team',
    description: 'Hands-on training for your administrators with documentation and best practices.',
  },
];

const benefits = [
  'Reduce knowledge search time by 80%',
  'Accelerate employee onboarding',
  'Ensure consistent, accurate answers',
  'Identify knowledge gaps automatically',
  'Maintain compliance documentation',
  'Improve cross-team collaboration',
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
              Expert-Led Implementation
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
              Get your AI knowledge base{' '}
              <span className="text-accent">production-ready in 8 weeks</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              Our knowledge experts work alongside your team to structure, ingest, 
              and optimize your internal knowledge for AI-powered access.
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
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Implementation Timeline */}
      <section className="border-t bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-foreground md:text-4xl">
              Structured 8-Week Implementation
            </h2>
            <p className="mt-4 text-muted-foreground">
              A proven methodology for successful knowledge base deployment
            </p>
          </div>

          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-border lg:block" />

            <div className="space-y-8 lg:space-y-12">
              {phases.map((phase, index) => (
                <div
                  key={phase.week}
                  className={`flex flex-col gap-8 lg:flex-row lg:items-center ${
                    index % 2 === 0 ? '' : 'lg:flex-row-reverse'
                  }`}
                >
                  <div className="flex-1">
                    <Card className={index % 2 === 0 ? 'lg:mr-12' : 'lg:ml-12'}>
                      <CardHeader>
                        <Badge variant="outline" className="w-fit">
                          {phase.week}
                        </Badge>
                        <CardTitle className="mt-2">{phase.title}</CardTitle>
                        <CardDescription>{phase.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {phase.tasks.map((task) => (
                            <li key={task} className="flex items-center gap-2 text-sm">
                              <CheckCircle2 className="h-4 w-4 text-success" />
                              {task}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* Timeline dot */}
                  <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground lg:flex">
                    <span className="font-bold">{index + 1}</span>
                  </div>
                  
                  <div className="hidden flex-1 lg:block" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Deliverables */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-foreground md:text-4xl">
              What You'll Receive
            </h2>
            <p className="mt-4 text-muted-foreground">
              Tangible outcomes from our expert implementation
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {deliverables.map((item) => (
              <Card key={item.title} className="text-center">
                <CardContent className="pt-6">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10">
                    <item.icon className="h-7 w-7 text-accent" />
                  </div>
                  <h3 className="font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="border-t bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-3xl font-bold text-foreground md:text-4xl">
                Transform how your organization accesses knowledge
              </h2>
              <p className="mt-4 text-muted-foreground">
                Companies that implement AI-powered knowledge management see dramatic 
                improvements in productivity, accuracy, and employee satisfaction.
              </p>
              <ul className="mt-8 space-y-4">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-success/10">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    </div>
                    <span className="text-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="bg-accent text-accent-foreground">
                <CardContent className="pt-6">
                  <Zap className="h-8 w-8" />
                  <div className="mt-4 text-3xl font-bold">80%</div>
                  <p className="mt-1 text-accent-foreground/80">
                    Reduction in search time
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <Clock className="h-8 w-8 text-accent" />
                  <div className="mt-4 text-3xl font-bold">40%</div>
                  <p className="mt-1 text-muted-foreground">
                    Faster onboarding
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <BarChart3 className="h-8 w-8 text-accent" />
                  <div className="mt-4 text-3xl font-bold">95%</div>
                  <p className="mt-1 text-muted-foreground">
                    Answer accuracy rate
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <Award className="h-8 w-8 text-accent" />
                  <div className="mt-4 text-3xl font-bold">3x</div>
                  <p className="mt-1 text-muted-foreground">
                    Knowledge utilization
                  </p>
                </CardContent>
              </Card>
            </div>
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
              and learn how our expert implementation can help.
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