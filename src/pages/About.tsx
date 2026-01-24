import { Link } from 'react-router-dom';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ArrowRight, 
  Lightbulb, 
  Target, 
  Zap,
  UserPlus,
  Brain,
  Users,
  BarChart3,
} from 'lucide-react';

const values = [
  {
    icon: Target,
    title: 'Mission-Driven',
    description: 'We believe every organization deserves instant access to their collective knowledge.',
  },
  {
    icon: Lightbulb,
    title: 'Innovation First',
    description: 'Leveraging cutting-edge AI to make knowledge management effortless and intelligent.',
  },
  {
    icon: Zap,
    title: 'Simplicity',
    description: 'Complex problems deserve simple solutions. We make powerful technology accessible.',
  },
];

const services = [
  {
    icon: UserPlus,
    title: 'Onboarding New Talent',
    description: 'Accelerate ramp-up time with role-specific knowledge and guidance.',
    link: '/services#onboarding',
  },
  {
    icon: Brain,
    title: 'AI Knowledge Vault',
    description: 'Instant AI-powered answers from your complete knowledge base.',
    link: '/services#knowledge-vault',
  },
  {
    icon: Users,
    title: 'Expert Team Onboarding',
    description: 'Our experts implement your knowledge into the AI for you.',
    link: '/services#expert-onboarding',
  },
  {
    icon: BarChart3,
    title: 'Employee Knowledge Analytics',
    description: 'Data-driven insights to improve performance and decisions.',
    link: '/services#analytics',
  },
];

export default function About() {
  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">
              Making organizational knowledge accessible
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              IntelliBase helps companies transform their scattered documents, policies, and procedures 
              into an intelligent, searchable knowledge base that employees can query in natural language.
            </p>
          </div>
        </div>
      </section>

      {/* The Problem Section */}
      <section className="border-t bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-3xl font-bold text-foreground md:text-4xl">
              The problem we're solving
            </h2>
            <div className="mt-8 space-y-6 text-muted-foreground">
              <p>
                Every organization accumulates valuable knowledge—in documents, wikis, emails, and 
                the minds of experienced employees. But accessing this knowledge is often frustrating, 
                time-consuming, and inefficient.
              </p>
              <p>
                Employees spend hours searching through folders, asking colleagues, or recreating 
                information that already exists somewhere. New hires struggle to find the resources 
                they need. Critical knowledge walks out the door when people leave.
              </p>
              <p>
                <strong className="text-foreground">IntelliBase changes this.</strong> By centralizing your organization's 
                knowledge and making it queryable through an AI assistant, we help teams find 
                answers in seconds instead of hours.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Services Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-foreground md:text-4xl">
              Our services
            </h2>
            <p className="mt-4 text-muted-foreground">
              Four comprehensive solutions for your knowledge management needs
            </p>
          </div>
          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
            {services.map((service) => (
              <Link to={service.link} key={service.title}>
                <Card className="group h-full transition-shadow hover:shadow-lg">
                  <CardContent className="flex gap-4 p-6">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                      <service.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{service.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{service.description}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link to="/services">
              <Button variant="outline">
                Explore all services
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="border-t bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-foreground md:text-4xl">
              Our values
            </h2>
          </div>
          <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
            {values.map((value) => (
              <div key={value.title} className="text-center">
                <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <value.icon className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">{value.title}</h3>
                <p className="mt-2 text-muted-foreground">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-foreground md:text-4xl">
              Ready to get started?
            </h2>
            <p className="mt-4 text-muted-foreground">
              Schedule a free consultation to see how IntelliBase can work for your organization.
            </p>
            <div className="mt-8">
              <Link to="/booking">
                <Button size="lg" className="bg-accent hover:bg-accent/90">
                  Book a free meeting
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
