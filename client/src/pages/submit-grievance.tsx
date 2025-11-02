// React and Hooks
import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";

// Form and Validation
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Data Management
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { insertGrievanceSchema } from "@shared/schema"; // Keep this, but we'll override description validation

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useI18n as _useI18n } from '@/lib/i18n';


// i18n
// Icons
import { 
  FileText, 
  Camera, 
  Mic, 
  MapPin, 
  User, 
  Phone, 
  Mail, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  X
} from "lucide-react";
import TermsFooter from "@/components/ui/terms-footer";

// categories and schema are created inside the component so translations (t) are available

export default function SubmitGrievance() {
  const [step, setStep] = useState(1);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const evidenceInputRef = useRef<HTMLInputElement | null>(null);
  const [evidenceFilesLocal, setEvidenceFilesLocal] = useState<File[]>([]);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // i18n hook and translated schema/categories need to be created inside the component
  const { t } = _useI18n();

  const categories = [
    { value: "Water Supply", label: t('waterSupply') },
    { value: "Road & Infrastructure", label: t('roadInfrastructure') },
    { value: "Electricity", label: t('electricity') },
    { value: "Sanitation & Waste Management", label: t('sanitationWaste') },
    { value: "Healthcare", label: t('healthcare') },
    { value: "Education", label: t('education') },
    { value: "Agriculture Support", label: t('agriculture') },
    { value: "Social Welfare Schemes", label: t('socialWelfareSchemes') },
    { value: "Other", label: t('other') }
  ];

  // Define the new character limit constant
  const DESCRIPTION_MAX_LENGTH = 5000; // <-- Changed from 500

  // Extend the existing schema to override the 'description' field's validation
  const formSchema = insertGrievanceSchema.extend({
    fullName: z.string().min(3, t('fullNameRequired')),
    mobileNumber: z.string().regex(/^\d{10}$/, t('mobileNumberFormat')),
    email: z.string().email(t('invalidEmail')).optional().or(z.literal("")),
    villageName: z.string().min(1, t('villageNameRequired')),
    priority: z.enum(["low", "medium", "high"]).optional().default("medium" as any),
    evidenceFiles: z.array(z.string()).optional().default([] as any),
    voiceRecordingUrl: z.string().nullable().optional(),
    voiceTranscription: z.string().nullable().optional(),
    resolutionTimeline: z.number().nullable().optional(),
    dueDate: z.any().nullable().optional(),
    resolutionNotes: z.string().nullable().optional(),
    resolutionEvidence: z.array(z.string()).optional().default([] as any),
    // Override the description validation here
    description: z.string()
                   .min(1, t('descriptionRequired')) // Ensure it's not empty
                   .max(DESCRIPTION_MAX_LENGTH, t('descriptionTooLong', { max: DESCRIPTION_MAX_LENGTH })), // New max length
  });

  useEffect(() => {
    let interval: number | undefined;

    async function startRecording() {
      recordedChunksRef.current = [];
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mr = new MediaRecorder(stream);
        mediaRecorderRef.current = mr;

        mr.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data);
        };

        mr.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
          setVoiceBlob(blob);
        };

        mr.start();
        setRecordingTime(0);
        interval = window.setInterval(() => {
          setRecordingTime((t) => t + 1);
        }, 1000);
      } catch (err) {
        console.error('Microphone access denied or unavailable', err);
        setIsRecording(false);
      }
    }

    if (isRecording) {
      startRecording();
    } else {
      // stop
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        (mediaRecorderRef.current.stream as MediaStream)?.getTracks().forEach(t => t.stop());
        mediaRecorderRef.current = null;
      }
      if (interval) {
        window.clearInterval(interval);
      }
    }

    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [isRecording]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    // cast via unknown to allow an initial empty category placeholder while keeping strong types for the form schema
    defaultValues: ({
      title: "",
      category: "",
      description: "",
      villageName: "",
      fullName: "",
      mobileNumber: "",
      email: "",
      priority: "medium",
      evidenceFiles: [],
      voiceRecordingUrl: null,
      voiceTranscription: null,
      resolutionTimeline: null,
      dueDate: null,
      resolutionNotes: null,
      resolutionEvidence: [],
    } as unknown as z.infer<typeof formSchema>),
  });

  // Function to validate file size and type
  const validateFile = (file: File) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error(t('fileTooLarge', { fileName: file.name }));
    }
    
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'video/mp4'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error(t('unsupportedFileFormat', { fileName: file.name }));
    }
    return true;
  };

  const submitMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      // Validate all files before submission
      try {
        evidenceFilesLocal.forEach(validateFile);
        if (voiceBlob && voiceBlob.size > 5 * 1024 * 1024) { // 5MB limit for voice
          throw new Error(t('voiceRecordingTooLarge'));
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: t('fileValidationFailed'),
          description: error instanceof Error ? error.message : t('invalidFile'),
        });
        throw error;
      }

      const formData = new FormData();
      
      // Append basic form data
      const basicFields = ['title', 'category', 'description', 'villageName', 'fullName', 'mobileNumber', 'email', 'priority'];
      basicFields.forEach(field => {
        if (data[field]) {
          formData.append(field, String(data[field]));
        }
      });

      // Append evidence files with size check
      if (evidenceFilesLocal.length > 0) {
        evidenceFilesLocal.forEach((file) => {
          formData.append("evidenceFiles", file);
        });
      }

      // Append voice recording if exists
      if (voiceBlob) {
        formData.append("voiceRecording", new File([voiceBlob], "voice.webm", { 
          type: voiceBlob.type 
        }));
      }

      // Get authentication token
      const token = (await import("@/lib/authService")).getToken();
      
      // Make the API request
      const res = await fetch("/api/grievances", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`${res.status}: ${txt}`);
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grievances"] });
      toast({
        title: t('grievanceSubmitSuccess'),
        description: t('grievanceSubmitDesc'),
      });
      navigate("/dashboard");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: t('submissionFailed'),
        description: error.message || t('submissionFailedDesc'),
      });
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    submitMutation.mutate(data);
  };

  // Helper to stop the MediaRecorder and wait for the 'stop' event so voiceBlob is finalized
  const stopMediaRecorderAndWait = (): Promise<void> => {
    return new Promise((resolve) => {
      const mr = mediaRecorderRef.current;
      if (!mr) return resolve();
      if (mr.state === 'inactive') return resolve();

      const onStopped = () => {
        try {
          (mr.stream as MediaStream)?.getTracks().forEach(t => t.stop());
        } catch (e) {
          /* ignore */
        }
        // clear ref (effect will also clear, but keep consistent)
        if (mediaRecorderRef.current === mr) mediaRecorderRef.current = null;
        mr.removeEventListener('stop', onStopped);
        resolve();
      };

      mr.addEventListener('stop', onStopped);
      try {
        mr.stop();
      } catch (e) {
        // If stop throws, still resolve soon
        mr.removeEventListener('stop', onStopped);
        resolve();
      }
    });
  };

  const nextStep = async () => {
    let fieldsToValidate: any[] = [];

    if (step === 1) {
      fieldsToValidate = ["title", "category"];
    } else if (step === 2) {
      fieldsToValidate = []; // No fields to validate on step 2 (evidence)
    } else if (step === 3) {
      // Validate description when moving from step 3
      fieldsToValidate = ["description"]; 
    } else if (step === 4) {
      // fieldsToValidate for step 4 if there's a next step (but there isn't, it's submit)
      // For final submission, form.handleSubmit takes care of all fields
    }

    // Trigger validation for the fields relevant to the current step
    const isValid = await form.trigger(fieldsToValidate);

    // Only proceed if valid AND not on the last step (step 4 is submission)
    if (isValid && step < 4) {
      // If recording is active, stop it and wait so the recorded blob is available in the next step
      if (isRecording) {
        // toggle state to false which will also run cleanup in the effect
        setIsRecording(false);
        // wait for recorder to stop and blob to be set
        await stopMediaRecorderAndWait();
        // give React a tick to update state/voiceBlob
        await new Promise((r) => setTimeout(r, 50));
      }

      setStep(step + 1);
    }
    // Note: If on step 4, this 'nextStep' function is not called,
    // the form is submitted directly by the submit button.
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const progress = (step / 4) * 100;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">{t('submitNewGrievance')}</h1>
        <p className="text-lg text-muted-foreground">{t('submitGrievanceDesc')}</p>
      </div>

      <div className="mb-8">
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium">{t('stepCount', { current: step, total: 4 })}</span>
          <span className="text-sm text-muted-foreground">{t('percentComplete', { percent: Math.round(progress) })}</span>
        </div>
        <Progress value={progress} className="h-2" data-testid="progress-submission" />
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { num: 1, label: t('problemDetails') },
          { num: 2, label: t('evidence') },
          { num: 3, label: t('detailedDescription') },
          { num: 4, label: t('contactInfo') }
        ].map((s) => (
          <div
            key={s.num}
            className={`flex items-center gap-2 px-4 py-2 rounded-md border ${
              step === s.num
                ? "bg-primary text-primary-foreground border-primary"
                : step > s.num
                ? "bg-status-resolved text-white border-status-resolved" // Assuming 'status-resolved' is a valid, existing Tailwind class
                : "bg-card text-muted-foreground border-border"
            }`}
          >
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-background/20">
              {step > s.num ? <CheckCircle2 className="w-4 h-4" /> : s.num}
            </div>
            <span className="text-sm font-medium hidden sm:inline">{s.label}</span>
          </div>
        ))}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  {t('problemIdentification')}
                </CardTitle>
                <CardDescription>{t('problemIdentificationDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">{t('problemTitleLabel')} *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t('problemTitlePlaceholder')}
                          className="text-base min-h-12"
                          data-testid="input-title"
                        />
                      </FormControl>
                      <FormDescription>
                        {t('problemTitleDesc')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">{t('categoryLabel')} *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="text-base min-h-12" data-testid="select-category">
                            <SelectValue placeholder={t('selectCategory')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  {t('uploadEvidence')}
                </CardTitle>
                <CardDescription>{t('uploadEvidenceDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {evidenceFilesLocal.length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {evidenceFilesLocal.map((file, index) => (
                        <div key={index} className="relative group aspect-square">
                          {file.type.startsWith('image/') ? (
                            <img
                              src={URL.createObjectURL(file)}
                              alt={`Evidence ${index + 1}`}
                              className="w-full h-full object-cover rounded-lg border"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-muted rounded-lg border">
                              <FileText className="w-8 h-8 text-muted-foreground" />
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEvidenceFilesLocal(evidenceFilesLocal.filter((_, i) => i !== index));
                            }}
                            className="absolute top-2 right-2 bg-background/80 text-foreground p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div
                      onClick={() => evidenceInputRef.current?.click()}
                      className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <p className="text-sm font-medium">{t('addMoreEvidence')}</p>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => evidenceInputRef.current?.click()}
                    className="border-2 border-dashed rounded-lg p-12 text-center hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <Camera className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-base font-medium mb-2">{t('dragDropUpload')}</p>
                    <p className="text-sm text-muted-foreground">
                      {t('supportedFileTypes')}
                    </p>
                  </div>
                )}
                <Input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  className="hidden"
                  data-testid="input-evidence-files"
                  ref={evidenceInputRef}
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files) {
                      const newFiles = Array.from(files);
                      setEvidenceFilesLocal([...evidenceFilesLocal, ...newFiles]);
                    }
                  }}
                />
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{t('evidenceNote')}</span>
                  <span>{t('filesCount', { current: evidenceFilesLocal.length, max: 5 })}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="w-5 h-5" />
                  {t('detailedDescription')}
                </CardTitle>
                <CardDescription>{t('detailedDescriptionDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">{t('problemDescription')} </FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder={t('problemDescriptionPlaceholder')}
                          className="min-h-40 text-base resize-none"
                          maxLength={DESCRIPTION_MAX_LENGTH} // <-- Changed this line
                          data-testid="textarea-description"
                        />
                      </FormControl>
                      <div className="flex justify-between">
                        <FormDescription>
                          {t('problemDescriptionHelper')}
                        </FormDescription>
                        <span className="text-sm text-muted-foreground">
                          {t('characterCount', { current: field.value?.length || 0, max: DESCRIPTION_MAX_LENGTH })}
                        </span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="border rounded-lg p-6 bg-muted/30">
                  <Label className="text-base mb-4 block">{t('voiceRecordingLabel')}</Label>
                  <div className="flex gap-3 items-center justify-center">
                    <Button
                      type="button"
                      variant={isRecording ? "destructive" : "secondary"}
                      size="lg"
                      onClick={() => setIsRecording(!isRecording)}
                      data-testid="button-voice-record"
                    >
                      <Mic className="w-5 h-5 mr-2" />
                      {isRecording ? t('stopRecording') : t('startRecording')}
                    </Button>
                    {recordingTime > 0 && (
                      <span className="text-sm text-muted-foreground">
                        {t('recordingTime', { 
                          minutes: Math.floor(recordingTime / 60), 
                          seconds: (recordingTime % 60).toString().padStart(2, '0')
                        })}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground text-center mt-4">
                    {t('voiceTranscribeInfo')}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 4 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  {t('locationContactInfo')}
                </CardTitle>
                <CardDescription>{t('locationContactDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="villageName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">{t('village Name')} *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t('Enter your village name')}
                          className="text-base min-h-12"
                          data-testid="input-village-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">{t('your Name')} *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                          <Input
                            {...field}
                            placeholder={t('Enter your full name as per Aadhaar')}
                            className="text-base min-h-12 pl-10"
                            data-testid="input-full-name"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mobileNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">{t('Mobile Number')} *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <div className="flex">
                            <div className="flex items-center justify-center px-3 min-h-12 bg-muted border border-r-0 rounded-l-md">
                            +91
                            </div>
                            <Input
                              {...field}
                              type="tel"
                              maxLength={10}
                              placeholder={t('Enter your 10-digit mobile number')}
                              className="text-base min-h-12 rounded-l-none"
                              onChange={(e) => {
                                const value = e.target.value.replace(/[^0-9]/g, '');
                                if (value.length <= 10) {
                                  field.onChange(value);
                                }
                              }}
                              data-testid="input-mobile-number"
                            />
                          </div>
                        </div>
                      </FormControl>
                      <FormDescription>
                        {t('smsUpdatesInfo', { mobile: field.value })}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">{t('email')} ({t('optional')})</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                          <Input
                            {...field}
                            type="email"
                            placeholder={t('Enter your email for updates (optional)')}
                            className="text-base min-h-12 pl-10"
                            data-testid="input-email"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="bg-muted/50 p-4 rounded-lg border border-border">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      required
                      className="mt-1 h-5 w-5 rounded border-border"
                      data-testid="checkbox-confirm-accuracy"
                    />
                    <span className="text-sm text-foreground">
                      {t('accuracyConfirmation')}
                    </span>
                  </label>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-4 justify-between">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={prevStep}
              disabled={step === 1}
              data-testid="button-previous-step"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('previous')}
            </Button>

            {step < 4 ? (
              <Button
                type="button"
                size="lg"
                onClick={nextStep}
                data-testid="button-next-step"
              >
                {t('next')}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="lg"
                disabled={submitMutation.isPending}
                data-testid="button-submit-grievance"
              >
                {submitMutation.isPending ? t('submitting') : t('submitGrievance')}
                <CheckCircle2 className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>

          {step === 4 && (
            <Button
              type="button"
              variant="ghost"
              size="lg"
              className="w-full"
              onClick={() => form.reset()}
              data-testid="button-reset-form"
            >
              {t('resetForm')}
            </Button>
          )}
        </form>
      </Form>
      <TermsFooter />
    </div>
  );
}