import { useState } from 'react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckCircle2, Calendar, Clock, Mail } from 'lucide-react';
import { z } from 'zod';

const bookingSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  company: z.string().min(2, 'Company name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  message: z.string().optional(),
});

type BookingFormData = z.infer<typeof bookingSchema>;

export default function Booking() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<Partial<BookingFormData>>({});
  const [formData, setFormData] = useState<BookingFormData>({
    name: '',
    company: '',
    email: '',
    message: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name as keyof BookingFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate form data
    const result = bookingSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<BookingFormData> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as keyof BookingFormData] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('booking_requests').insert([
        {
          name: formData.name,
          company: formData.company,
          email: formData.email,
          message: formData.message || null,
        },
      ]);

      if (error) throw error;

      setIsSubmitted(true);
      toast.success('Thank you! We\'ll be in touch soon.');
    } catch (error) {
      console.error('Error submitting booking:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <PublicLayout>
        <section className="py-20 md:py-28">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-lg text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">Thank you!</h1>
              <p className="mt-4 text-muted-foreground">
                We've received your request and will be in touch within 24 hours to schedule your meeting.
              </p>
            </div>
          </div>
        </section>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-5xl">
            <div className="grid gap-12 lg:grid-cols-2">
              {/* Left side - Info */}
              <div>
                <h1 className="text-4xl font-bold tracking-tight text-foreground">
                  Book a free meeting
                </h1>
                <p className="mt-4 text-lg text-muted-foreground">
                  Schedule a consultation to see how IntelliBase can transform your organization's 
                  knowledge management.
                </p>

                <div className="mt-10 space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-accent/10">
                      <Calendar className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">30-minute demo</h3>
                      <p className="text-sm text-muted-foreground">
                        We'll walk you through the platform and answer your questions.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-accent/10">
                      <Clock className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Quick response</h3>
                      <p className="text-sm text-muted-foreground">
                        We'll get back to you within 24 hours.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-accent/10">
                      <Mail className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">No commitment</h3>
                      <p className="text-sm text-muted-foreground">
                        Just a friendly conversation about your needs.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right side - Form */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>Request a meeting</CardTitle>
                  <CardDescription>
                    Fill out the form below and we'll be in touch.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full name</Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="John Smith"
                        className={errors.name ? 'border-destructive' : ''}
                      />
                      {errors.name && (
                        <p className="text-sm text-destructive">{errors.name}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="company">Company</Label>
                      <Input
                        id="company"
                        name="company"
                        value={formData.company}
                        onChange={handleChange}
                        placeholder="Acme Inc."
                        className={errors.company ? 'border-destructive' : ''}
                      />
                      {errors.company && (
                        <p className="text-sm text-destructive">{errors.company}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Work email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="john@acme.com"
                        className={errors.email ? 'border-destructive' : ''}
                      />
                      {errors.email && (
                        <p className="text-sm text-destructive">{errors.email}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">Message (optional)</Label>
                      <Textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        placeholder="Tell us about your knowledge management needs..."
                        rows={4}
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-accent hover:bg-accent/90"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Submitting...' : 'Request meeting'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}