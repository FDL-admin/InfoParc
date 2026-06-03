"""
Commande de peuplement de la base de données — InfoParc BUMIGEB
Usage :
    python manage.py seed            # Peuple sans écraser
    python manage.py seed --reset    # Vide puis repeuple
    python manage.py seed --quiet    # Sans affichage
"""

import random
from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from contracts.models import Alert, Contract
from equipment.models import Assignment, Equipment, SoftwareLicense, Supplier
from tickets.models import AcquisitionRequest, Evaluation, Intervention, Ticket
from users.models import Department

User = get_user_model()


def ago(days=0, weeks=0, hours=0):
    """Retourne un datetime dans le passé, conscient du fuseau."""
    return timezone.now() - timedelta(days=days, weeks=weeks, hours=hours)


def date_ago(days=0, weeks=0):
    return (timezone.now() - timedelta(days=days, weeks=weeks)).date()


class Command(BaseCommand):
    help = "Peuple la base de données avec des données de démonstration BUMIGEB"

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset", action="store_true",
            help="Vide toutes les tables avant de peupler"
        )
        parser.add_argument(
            "--quiet", action="store_true",
            help="Supprime les messages de progression"
        )

    def log(self, msg):
        if not self.quiet:
            self.stdout.write(msg)

    def ok(self, msg):
        if not self.quiet:
            self.stdout.write(self.style.SUCCESS(f"  [OK]  {msg}"))

    def section(self, title):
        if not self.quiet:
            self.stdout.write(self.style.HTTP_INFO(f"\n--- {title} ---"))

    # ─────────────────────────────────────────────────────────────
    @transaction.atomic
    def handle(self, *args, **options):
        self.quiet = options["quiet"]

        if options["reset"]:
            self.section("Remise à zéro")
            Alert.objects.all().delete()
            Contract.objects.all().delete()
            Evaluation.objects.all().delete()
            Intervention.objects.all().delete()
            AcquisitionRequest.objects.all().delete()
            Ticket.objects.all().delete()
            SoftwareLicense.objects.all().delete()
            Assignment.objects.all().delete()
            Equipment.objects.all().delete()
            Supplier.objects.all().delete()
            User.objects.filter(is_superuser=False).delete()
            Department.objects.all().delete()
            self.ok("Base vidée")

        self.section("Départements")
        deps = self._seed_departments()

        self.section("Utilisateurs")
        users = self._seed_users(deps)

        self.section("Fournisseurs / Prestataires")
        suppliers = self._seed_suppliers()

        self.section("Équipements")
        equipment = self._seed_equipment(deps, users, suppliers)

        self.section("Affectations")
        self._seed_assignments(equipment, users)

        self.section("Licences logicielles")
        self._seed_licenses(equipment)

        self.section("Tickets & Interventions")
        tickets = self._seed_tickets(equipment, users)
        self._seed_interventions(tickets, users, suppliers)

        self.section("Évaluations")
        self._seed_evaluations(tickets)

        self.section("Demandes d'acquisition")
        self._seed_acquisition_requests(users)

        self.section("Contrats")
        contracts = self._seed_contracts(equipment, suppliers)

        self.section("Alertes")
        self._seed_alerts(contracts, equipment)

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("=========================================="))
        self.stdout.write(self.style.SUCCESS("  Seed termine avec succes !"))
        self.stdout.write(self.style.SUCCESS("=========================================="))
        self.stdout.write(f"  Départements   : {Department.objects.count()}")
        self.stdout.write(f"  Utilisateurs   : {User.objects.count()}")
        self.stdout.write(f"  Fournisseurs   : {Supplier.objects.count()}")
        self.stdout.write(f"  Équipements    : {Equipment.objects.count()}")
        self.stdout.write(f"  Tickets        : {Ticket.objects.count()}")
        self.stdout.write(f"  Contrats       : {Contract.objects.count()}")
        self.stdout.write(f"  Alertes        : {Alert.objects.count()}")
        self.stdout.write("")
        self.stdout.write("  Connexion superadmin : admin@bumigeb.bf / Admin1234!")
        self.stdout.write("  Connexion admin      : kone.tech@bumigeb.bf / Admin1234!")
        self.stdout.write("  Connexion user       : traore.s@bumigeb.bf / User1234!")

    # ─────────────────────────────────────────────────────────────
    def _seed_departments(self):
        data = [
            ("Direction Générale",                     "DG",       "bobo", "Direction générale du BUMIGEB à Bobo-Dioulasso"),
            ("Service Informatique",                   "SI",       "bobo", "Gestion du parc informatique et support technique"),
            ("Service Géologie",                       "SG",       "bobo", "Études et travaux géologiques"),
            ("Service Mines et Carrières",             "SMC",      "bobo", "Gestion des activités minières et des carrières"),
            ("Direction des Ressources Humaines",      "DRH",      "bobo", "Gestion du personnel et des ressources humaines"),
            ("Service Financier et Comptable",         "SFC",      "bobo", "Gestion financière et comptable"),
            ("Direction Régionale Ouagadougou",        "DR-OUAGA", "ouaga","Représentation régionale à Ouagadougou"),
            ("Service Laboratoire",                    "SLABO",    "bobo", "Analyses et essais en laboratoire"),
        ]
        deps = {}
        for name, sigle, site, desc in data:
            d, created = Department.objects.get_or_create(
                sigle=sigle,
                defaults={"name": name, "site": site, "description": desc},
            )
            deps[sigle] = d
            if created:
                self.ok(f"Département {sigle}")
        return deps

    # ─────────────────────────────────────────────────────────────
    def _seed_users(self, deps):
        users = {}

        def make(email, first, last, role, dep_key, pwd="Admin1234!"):
            u, created = User.objects.get_or_create(
                email=email,
                defaults={
                    "first_name": first,
                    "last_name": last,
                    "role": role,
                    "department": deps.get(dep_key),
                    "is_staff": role in ("admin", "superadmin"),
                    "is_active": True,
                },
            )
            if created:
                u.set_password(pwd)
                u.save()
                self.ok(f"{role:12s}  {first} {last} <{email}>")
            return u

        # Superadmin
        users["superadmin"] = make("admin@bumigeb.bf",          "Abdoul",   "OUÉDRAOGO", "superadmin", "DG")

        # Admins / Techniciens
        users["admin1"]     = make("kone.tech@bumigeb.bf",      "Issouf",   "KONÉ",      "admin",      "SI")
        users["admin2"]     = make("some.b@bumigeb.bf",         "Bernard",  "SOMÉ",      "admin",      "SI")
        users["admin3"]     = make("ilboudo.p@bumigeb.bf",      "Pascal",   "ILBOUDO",   "admin",      "DR-OUAGA")

        # Utilisateurs standards
        users["user1"]      = make("traore.s@bumigeb.bf",       "Salimata", "TRAORÉ",    "user",       "SG",  "User1234!")
        users["user2"]      = make("kabore.a@bumigeb.bf",       "Adama",    "KABORÉ",    "user",       "SMC", "User1234!")
        users["user3"]      = make("sawadogo.f@bumigeb.bf",     "Fatimata", "SAWADOGO",  "user",       "DRH", "User1234!")
        users["user4"]      = make("ouattara.m@bumigeb.bf",     "Moussa",   "OUATTARA",  "user",       "SFC", "User1234!")
        users["user5"]      = make("diallo.h@bumigeb.bf",       "Haoua",    "DIALLO",    "user",       "SLABO","User1234!")
        users["user6"]      = make("bambara.k@bumigeb.bf",      "Kassoum",  "BAMBARA",   "user",       "DR-OUAGA","User1234!")
        users["user7"]      = make("zongo.r@bumigeb.bf",        "Rasmané",  "ZONGO",     "user",       "SG",  "User1234!")
        users["user8"]      = make("coulibaly.n@bumigeb.bf",    "Nafissatou","COULIBALY", "user",       "SMC", "User1234!")

        return users

    # ─────────────────────────────────────────────────────────────
    def _seed_suppliers(self):
        data = [
            ("BFTECH SARL",          "supplier", "Boubacar SANA",    "bftech@bftech.bf",         "+226 25 36 14 00", "both",   "Fournisseur informatique agréé, partenaire HP et Dell"),
            ("CyberBF Solutions",    "provider", "Idrissa COMPAORÉ", "contact@cyberbf.bf",       "+226 25 30 80 10", "onsite", "Prestataire maintenance réseaux et systèmes"),
            ("Africa IT Group",      "both",     "Amidou TAPSOBA",   "info@africait.bf",          "+226 25 33 60 50", "both",   "Intégrateur solutions IT, fournitures et maintenance"),
            ("SYSCOM Burkina",       "supplier", "Clarisse NIKIEMA", "syscom@syscom.bf",          "+226 25 36 20 00", "remote", "Distribution matériel informatique et consommables"),
            ("ProNet Afrique",       "provider", "Djibril OUÉDRAOGO","pronet@pronet.bf",          "+226 25 31 00 25", "both",   "Câblage réseau, installation et supervision"),
        ]
        suppliers = {}
        for name, stype, contact, email, phone, mode, notes in data:
            s, created = Supplier.objects.get_or_create(
                name=name,
                defaults={
                    "type": stype,
                    "contact_name": contact,
                    "email": email,
                    "phone": phone,
                    "intervention_mode": mode,
                    "notes": notes,
                },
            )
            suppliers[name] = s
            if created:
                self.ok(f"Fournisseur : {name}")
        return suppliers

    # ─────────────────────────────────────────────────────────────
    def _seed_equipment(self, deps, users, suppliers):
        supplier = list(suppliers.values())[0]
        bftech   = suppliers.get("BFTECH SARL", supplier)
        syscom   = suppliers.get("SYSCOM Burkina", supplier)

        data = [
            # (name, type, brand, model, serial, p_date, price, warranty, status, dep, user, site, lifespan)
            ("PC Bureau DG-01",      "desktop", "HP",     "EliteDesk 800 G6",  "HP-DG-0001", date_ago(730), Decimal("850000"),  date_ago(-365), "active",  "DG",    "superadmin", "bobo", 5),
            ("PC Bureau DG-02",      "desktop", "Dell",   "OptiPlex 7090",     "DL-DG-0002", date_ago(600), Decimal("780000"),  date_ago(-200), "active",  "DG",    None,         "bobo", 5),
            ("Laptop DG-01",         "laptop",  "HP",     "EliteBook 840 G8",  "HP-LT-0001", date_ago(400), Decimal("1200000"), date_ago(-730), "active",  "DG",    "superadmin", "bobo", 4),
            ("PC Bureau SI-01",      "desktop", "HP",     "ProDesk 400 G7",    "HP-SI-0001", date_ago(500), Decimal("720000"),  date_ago(-400), "active",  "SI",    "admin1",     "bobo", 5),
            ("PC Bureau SI-02",      "desktop", "Dell",   "OptiPlex 5090",     "DL-SI-0002", date_ago(365), Decimal("700000"),  date_ago(-365), "active",  "SI",    "admin2",     "bobo", 5),
            ("Laptop SI-01",         "laptop",  "Lenovo", "ThinkPad E15 Gen4", "LN-SI-0001", date_ago(180), Decimal("1350000"), date_ago(-550), "active",  "SI",    "admin1",     "bobo", 4),
            ("PC Bureau SG-01",      "desktop", "HP",     "ProDesk 600 G6",    "HP-SG-0001", date_ago(800), Decimal("680000"),  date_ago(30),   "active",  "SG",    "user1",      "bobo", 5),
            ("PC Bureau SG-02",      "desktop", "HP",     "ProDesk 600 G6",    "HP-SG-0002", date_ago(800), Decimal("680000"),  date_ago(60),   "repair",  "SG",    "user7",      "bobo", 5),
            ("Laptop SG-01",         "laptop",  "Dell",   "Latitude 5520",     "DL-LT-0002", date_ago(300), Decimal("1100000"), date_ago(-650), "active",  "SG",    "user7",      "bobo", 4),
            ("PC Bureau SMC-01",     "desktop", "Acer",   "Veriton M4680G",    "AC-SMC-001", date_ago(900), Decimal("620000"),  date_ago(90),   "active",  "SMC",   "user2",      "bobo", 5),
            ("PC Bureau SMC-02",     "desktop", "Acer",   "Veriton M4680G",    "AC-SMC-002", date_ago(900), Decimal("620000"),  date_ago(10),   "broken",  "SMC",   "user8",      "bobo", 5),
            ("Laptop SMC-01",        "laptop",  "HP",     "ProBook 450 G9",    "HP-LT-0003", date_ago(200), Decimal("1050000"), date_ago(-700), "active",  "SMC",   "user2",      "bobo", 4),
            ("PC Bureau DRH-01",     "desktop", "HP",     "EliteDesk 705 G8",  "HP-DRH-001", date_ago(450), Decimal("710000"),  date_ago(-300), "active",  "DRH",   "user3",      "bobo", 5),
            ("PC Bureau SFC-01",     "desktop", "Dell",   "OptiPlex 3090",     "DL-SFC-001", date_ago(360), Decimal("650000"),  date_ago(-300), "active",  "SFC",   "user4",      "bobo", 5),
            ("PC Bureau SLABO-01",   "desktop", "HP",     "Z2 Tower G9",       "HP-LAB-001", date_ago(150), Decimal("920000"),  date_ago(-720), "active",  "SLABO", "user5",      "bobo", 5),
            ("PC Bureau OUAGA-01",   "desktop", "HP",     "ProDesk 400 G7",    "HP-OG-0001", date_ago(400), Decimal("720000"),  date_ago(-310), "active",  "DR-OUAGA","user6",    "ouaga",5),
            ("Laptop OUAGA-01",      "laptop",  "Lenovo", "ThinkPad L15",      "LN-OG-0001", date_ago(280), Decimal("980000"),  date_ago(-600), "active",  "DR-OUAGA","admin3",   "ouaga",4),
            ("Imprimante DG-01",     "printer", "HP",     "LaserJet Pro M404",  "HP-PR-0001", date_ago(600), Decimal("320000"),  date_ago(-240), "active",  "DG",    None,         "bobo", 6),
            ("Imprimante SI-01",     "printer", "Canon",  "imageCLASS MF445",  "CN-PR-0001", date_ago(400), Decimal("280000"),  date_ago(-130), "repair",  "SI",    None,         "bobo", 6),
            ("Imprimante SG-01",     "printer", "HP",     "LaserJet M428",     "HP-PR-0002", date_ago(500), Decimal("310000"),  date_ago(-200), "active",  "SG",    None,         "bobo", 6),
            ("Serveur Principal",    "server",  "HP",     "ProLiant DL360 G10","HP-SV-0001", date_ago(730), Decimal("4500000"), date_ago(-365), "active",  "SI",    None,         "bobo", 7),
            ("Serveur Backup",       "server",  "Dell",   "PowerEdge R540",    "DL-SV-0001", date_ago(500), Decimal("3800000"), date_ago(-200), "active",  "SI",    None,         "bobo", 7),
            ("Switch Core",          "network", "Cisco",  "Catalyst 2960-X",   "CS-SW-0001", date_ago(800), Decimal("1200000"), date_ago(-365), "active",  "SI",    None,         "bobo", 8),
            ("Switch Accès-01",      "network", "Cisco",  "Catalyst 2960-S",   "CS-SW-0002", date_ago(800), Decimal("750000"),  date_ago(-365), "active",  "SI",    None,         "bobo", 8),
            ("PC Stock-01",          "desktop", "HP",     "ProDesk 400 G7",    "HP-STK-001", date_ago(60),  Decimal("720000"),  date_ago(-720), "stock",   "SI",    None,         "bobo", 5),
            ("PC Stock-02",          "desktop", "Dell",   "OptiPlex 3090",     "DL-STK-001", date_ago(60),  Decimal("650000"),  date_ago(-720), "stock",   "SI",    None,         "bobo", 5),
            ("Laptop Stock-01",      "laptop",  "HP",     "ProBook 440 G9",    "HP-STK-LT1", date_ago(30),  Decimal("950000"),  date_ago(-720), "stock",   "SI",    None,         "bobo", 4),
            ("Scanner SG-01",        "scanner", "Epson",  "WorkForce DS-870",  "EP-SC-0001", date_ago(400), Decimal("450000"),  date_ago(-310), "active",  "SG",    None,         "bobo", 6),
        ]

        equipment_map = {}
        user_map = {
            "superadmin": users.get("superadmin"),
            "admin1": users.get("admin1"),
            "admin2": users.get("admin2"),
            "admin3": users.get("admin3"),
            "user1": users.get("user1"),
            "user2": users.get("user2"),
            "user3": users.get("user3"),
            "user4": users.get("user4"),
            "user5": users.get("user5"),
            "user6": users.get("user6"),
            "user7": users.get("user7"),
            "user8": users.get("user8"),
        }

        for (name, etype, brand, model, serial, p_date,
             price, warranty, status, dep_key, user_key, site, lifespan) in data:
            e, created = Equipment.objects.get_or_create(
                serial_number=serial,
                defaults={
                    "name": name,
                    "type": etype,
                    "brand": brand,
                    "model": model,
                    "purchase_date": p_date,
                    "purchase_price": price,
                    "warranty_end_date": warranty,
                    "lifespan_years": lifespan,
                    "status": status,
                    "department": deps.get(dep_key),
                    "assigned_to": user_map.get(user_key) if user_key else None,
                    "supplier": bftech if etype in ("desktop", "laptop") else syscom,
                    "site": site,
                    "is_laptop": etype == "laptop",
                    "location": f"Bureau {dep_key}" if dep_key else "Salle serveur",
                },
            )
            equipment_map[serial] = e
            if created:
                self.ok(f"{status:8s}  {name}")

        return equipment_map

    # ─────────────────────────────────────────────────────────────
    def _seed_assignments(self, equipment_map, users):
        pairs = [
            ("HP-DG-0001", "superadmin", date_ago(730), None),
            ("HP-LT-0001", "superadmin", date_ago(400), None),
            ("HP-SI-0001", "admin1",     date_ago(500), None),
            ("DL-SI-0002", "admin2",     date_ago(365), None),
            ("LN-SI-0001", "admin1",     date_ago(180), None),
            ("HP-SG-0001", "user1",      date_ago(800), None),
            ("DL-LT-0002", "user7",      date_ago(300), None),
            ("AC-SMC-001", "user2",      date_ago(900), None),
            ("HP-LT-0003", "user2",      date_ago(200), None),
            ("HP-DRH-001", "user3",      date_ago(450), None),
            ("DL-SFC-001", "user4",      date_ago(360), None),
            ("HP-LAB-001", "user5",      date_ago(150), None),
            ("HP-OG-0001", "user6",      date_ago(400), None),
            ("LN-OG-0001", "admin3",     date_ago(280), None),
        ]
        for serial, user_key, start, end in pairs:
            eq = equipment_map.get(serial)
            u  = users.get(user_key)
            if not eq or not u:
                continue
            a, created = Assignment.objects.get_or_create(
                equipment=eq,
                user=u,
                date_start=start,
                defaults={"date_end": end, "notes": "Affectation initiale"},
            )
            if created:
                self.ok(f"Affectation {serial} -> {u.first_name} {u.last_name}")

    # ─────────────────────────────────────────────────────────────
    def _seed_licenses(self, equipment_map):
        desktops = Equipment.objects.filter(type="desktop", status="active")
        laptops  = Equipment.objects.filter(type="laptop",  status="active")
        all_pcs  = list(desktops) + list(laptops)

        licenses_data = [
            ("Microsoft Windows 11 Pro",    "Microsoft", "W11-BUMIGEB-2024-xxxxx", 20, date_ago(-365), all_pcs[:15]),
            ("Microsoft Office 365",         "Microsoft", "O365-BUM-2024-yyyyy",   15, date_ago(-180), all_pcs[:12]),
            ("Kaspersky Endpoint Security",  "Kaspersky", "KES-BF-2024-zzzzz",     25, date_ago(-90),  all_pcs),
            ("AutoCAD 2024",                 "Autodesk",  "AC-BUM-2024-aaaaa",      5, date_ago(-270), list(laptops)[:5]),
            ("ArcGIS Pro",                   "Esri",      "ARCGIS-BF-2024-bbbbb",   4, date_ago(-60),  list(laptops)[:4]),
        ]
        for name, editor, key, total, expiry, eqs in licenses_data:
            lic, created = SoftwareLicense.objects.get_or_create(
                name=name,
                defaults={
                    "editor": editor,
                    "license_key": key,
                    "total_licenses": total,
                    "expiry_date": expiry,
                },
            )
            if created:
                lic.equipment.set(eqs[:total])
                self.ok(f"Licence : {name} ({total} postes)")

    # ─────────────────────────────────────────────────────────────
    def _seed_tickets(self, equipment_map, users):
        admins  = [users["admin1"], users["admin2"], users["admin3"]]
        reqs    = [users[f"user{i}"] for i in range(1, 9)]
        eq_list = list(Equipment.objects.exclude(type__in=["server", "network"]))

        tickets_data = [
            # (title, desc, category, priority, status, eq_serial, requester_key, assigned_key, created_weeks_ago, resolved_weeks_ago)
            ("Écran noir au démarrage",         "Le PC ne démarre plus, l'écran reste noir après l'appui sur le bouton power.",                  "hardware",  "critical", "resolved",    "HP-SG-0002", "user7",      "admin1",  12, 11),
            ("Virus détecté sur poste",          "L'antivirus a détecté un logiciel malveillant sur mon poste.",                                   "software",  "high",     "resolved",    "AC-SMC-001", "user2",      "admin1",  11, 10),
            ("Imprimante hors service",          "L'imprimante du service informatique n'imprime plus, affiche une erreur papier.",                "printer",   "normal",   "resolved",    "CN-PR-0001", "admin2",     "admin2",  11, 10),
            ("Connexion réseau instable",        "La connexion Internet est très lente et coupe régulièrement depuis lundi matin.",               "network",   "high",     "resolved",    None,         "user1",      "admin1",  10,  9),
            ("Mise à jour Windows bloquée",      "Windows Update est bloqué à 78%, le PC ne répond plus depuis plusieurs heures.",                "software",  "normal",   "resolved",    "HP-DG-0001", "superadmin", "admin2",  10,  9),
            ("Clavier défectueux",               "Plusieurs touches du clavier ne fonctionnent plus (lettres A, E, Z).",                          "hardware",  "low",      "resolved",    "DL-SFC-001", "user4",      "admin2",   9,  8),
            ("Partage réseau inaccessible",      "Impossible d'accéder au dossier partagé \\\\serveur\\partage depuis mon poste.",                 "network",   "high",     "resolved",    None,         "user3",      "admin1",   9,  8),
            ("PC qui surchauffe",                "Mon ordinateur émet un bruit anormal et s'éteint soudainement après 30 min d'utilisation.",     "hardware",  "high",     "resolved",    "AC-SMC-002", "user8",      "admin1",   8,  7),
            ("Office ne s'ouvre plus",           "Microsoft Office affiche une erreur de licence au lancement depuis la mise à jour.",             "software",  "normal",   "resolved",    "HP-LT-0003", "user2",      "admin2",   8,  7),
            ("Problème messagerie Outlook",      "Outlook ne synchronise plus les emails depuis 2 jours, les messages restent en attente.",        "software",  "normal",   "resolved",    "HP-DRH-001", "user3",      "admin2",   7,  6),
            ("Disque dur plein",                 "Le disque C: est à 99% de capacité, le PC est très lent.",                                      "hardware",  "normal",   "resolved",    "DL-DG-0002", "superadmin", "admin1",   7,  6),
            ("Écran fissuré laptop",             "L'écran de mon laptop est fissuré suite à une chute accidentelle.",                             "hardware",  "high",     "resolved",    "LN-SI-0001", "admin1",     "admin2",   6,  5),
            ("Panne alimentation PC",            "Le PC du laboratoire ne s'allume plus du tout, suspicion de panne bloc d'alimentation.",        "hardware",  "critical", "resolved",    "HP-LAB-001", "user5",      "admin1",   6,  5),
            ("VPN ne fonctionne pas",            "Impossible de me connecter au VPN BUMIGEB depuis mon domicile pour le télétravail.",            "network",   "normal",   "resolved",    None,         "user6",      "admin3",   5,  4),
            ("Installation ArcGIS",              "Besoin d'installer ArcGIS Pro sur mon poste pour les travaux de cartographie.",                 "software",  "low",      "resolved",    "DL-LT-0002", "user7",      "admin1",   5,  4),
            ("Souris optique en panne",          "La souris du bureau ne réagit plus, le curseur reste figé.",                                    "hardware",  "low",      "resolved",    "HP-SG-0001", "user1",      "admin2",   4,  3),
            ("Accès refusé sur application RH", "Impossible d'ouvrir l'application de gestion des congés, message 'accès refusé'.",              "software",  "normal",   "resolved",    None,         "user3",      "admin2",   4,  3),
            ("PC ne reconnaît pas l'imprimante", "Le poste du directeur ne voit plus l'imprimante réseau depuis la mise à jour.",                "printer",   "normal",   "in_progress", "HP-DG-0001", "superadmin", "admin1",   3, None),
            ("Mise à jour antivirus",            "Demande de mise à jour de la base de données de l'antivirus Kaspersky.",                        "software",  "low",      "assigned",    None,         "user4",      "admin2",   2, None),
            ("Connexion lente Ouagadougou",      "La connexion Internet est particulièrement lente au bureau de Ouagadougou.",                    "network",   "high",     "in_progress", None,         "user6",      "admin3",   2, None),
            ("Récupération de données",          "Récupération de fichiers suite à suppression accidentelle sur le poste SMC-02.",               "hardware",  "critical", "open",        "AC-SMC-002", "user8",      None,        1, None),
            ("Installation imprimante SLABO",   "Installation et configuration d'une nouvelle imprimante pour le laboratoire.",                  "printer",   "normal",   "open",        None,         "user5",      None,        1, None),
            ("Problème WebCam réunion",          "La caméra intégrée du laptop ne fonctionne pas lors des réunions Teams.",                      "hardware",  "normal",   "open",        "LN-OG-0001", "user6",      None,        0, None),
            ("Mise à niveau RAM",               "Demande d'ajout de mémoire RAM sur le PC du service géologie (actuellement 4 Go).",            "hardware",  "low",      "open",        "HP-SG-0002", "user7",      None,        0, None),
            ("Sauvegarde données géologiques",  "Mise en place d'une sauvegarde automatique des données de cartographie géologique.",           "software",  "high",     "waiting",     None,         "user1",      "admin1",    1, None),
        ]

        created_tickets = []
        for (title, desc, cat, prio, status, eq_serial,
             req_key, assigned_key, created_w, resolved_w) in tickets_data:

            if Ticket.objects.filter(title=title).exists():
                t = Ticket.objects.get(title=title)
                created_tickets.append((t, status))
                continue

            eq  = equipment_map.get(eq_serial) if eq_serial else None
            req = users.get(req_key)
            asg = users.get(assigned_key) if assigned_key else None

            t = Ticket(
                title=title,
                description=desc,
                category=cat,
                priority=prio,
                status=status,
                equipment=eq,
                requester=req,
                assigned_to=asg,
                resolved_at=ago(weeks=resolved_w) if resolved_w is not None else None,
            )
            t.save()

            # Rétrodater created_at pour alimenter le graphique
            Ticket.objects.filter(pk=t.pk).update(
                created_at=ago(weeks=created_w, hours=random.randint(0, 40)),
            )
            created_tickets.append((t, status))
            self.ok(f"{status:12s}  {title[:55]}")

        return created_tickets

    # ─────────────────────────────────────────────────────────────
    def _seed_interventions(self, tickets, users, suppliers):
        admin1 = users["admin1"]
        admin2 = users["admin2"]
        admin3 = users["admin3"]
        prest  = suppliers.get("CyberBF Solutions") or list(suppliers.values())[0]

        interventions = [
            # (ticket_title_fragment, technician, description, duration, materials, amount, is_paid)
            ("Écran noir",          admin1, "Remplacement du câble d'alimentation interne et nettoyage des contacts.",       90, "Câble alimentation ATX",         None,       False),
            ("Virus détecté",       admin1, "Analyse complète, suppression du malware, mise à jour de l'antivirus.",         45, "",                               None,       False),
            ("Imprimante hors",     admin2, "Nettoyage des rouleaux, remplacement du kit de maintenance.",                  60, "Kit maintenance Canon MF445",     Decimal("35000"), True),
            ("Connexion réseau",    admin1, "Reconfiguration des paramètres DNS et redémarrage du switch accès.",            30, "",                               None,       False),
            ("Windows Update",      admin2, "Forçage de la mise à jour en ligne de commande, correction des entrées registre.",50, "",                             None,       False),
            ("Clavier défectueux",  admin2, "Remplacement du clavier USB par un modèle de stock.",                          15, "Clavier HP USB (stock)",          None,       False),
            ("Partage réseau",      admin1, "Reconfiguration des droits d'accès SMB et vérification des partages.",         40, "",                               None,       False),
            ("PC qui surchauffe",   admin1, "Nettoyage complet, remplacement de la pâte thermique, vérification ventilateur.",75, "Pâte thermique Arctic MX-4",   Decimal("5000"),  True),
            ("Office ne s'ouvre",   admin2, "Réactivation de la licence Office 365 via portail admin.",                     20, "",                               None,       False),
            ("messagerie Outlook",  admin2, "Reconfiguration du profil Outlook, vérification des règles Exchange.",          35, "",                               None,       False),
            ("Disque dur plein",    admin1, "Nettoyage des fichiers temporaires, archivage des données sur serveur.",        60, "",                               None,       False),
            ("Écran fissuré",       admin2, "Commande et remplacement de l'écran LCD du ThinkPad E15.",                    120, "Écran LCD ThinkPad E15 Gen4",    Decimal("180000"), True),
            ("Panne alimentation",  admin1, "Diagnostic : bloc alimentation HS, remplacement par pièce de stock.",          90, "Bloc alimentation 500W",         Decimal("45000"), True),
            ("VPN ne fonctionne",   admin3, "Réinstallation du client VPN Cisco, mise à jour des certificats.",             30, "",                               None,       False),
            ("Installation ArcGIS", admin1, "Installation ArcGIS Pro 3.1, configuration des licences réseau.",              60, "",                               None,       False),
            ("Souris optique",      admin2, "Remplacement de la souris par un modèle de stock.",                            10, "Souris optique USB (stock)",      None,       False),
            ("Accès refusé",        admin2, "Correction des droits utilisateur dans Active Directory.",                      25, "",                               None,       False),
            ("PC ne reconnaît pas", admin1, "En cours : mise à jour du pilote d'imprimante, test en cours.",                45, "",                               None,       False),
            ("Connexion lente Ouag",admin3, "Diagnostic en cours : analyse des logs réseau et test de bande passante.",     60, "",                               None,       False),
        ]

        for fragment, tech, desc, duration, materials, amount, paid in interventions:
            t_obj = next(
                (t for t, _ in tickets if fragment.lower() in t.title.lower()),
                None,
            )
            if not t_obj:
                continue
            if Intervention.objects.filter(ticket=t_obj, technician=tech).exists():
                continue
            Intervention.objects.create(
                ticket=t_obj,
                technician=tech,
                description=desc,
                duration_minutes=duration,
                materials_provided=materials,
                amount=amount,
                is_paid=paid,
                provider=prest if amount and amount > Decimal("50000") else None,
            )
            self.ok(f"Intervention sur : {t_obj.title[:50]}")

    # ─────────────────────────────────────────────────────────────
    def _seed_evaluations(self, tickets):
        ratings = [
            ("Écran noir",       5, "Intervention rapide et efficace, problème résolu en une journée."),
            ("Virus détecté",    4, "Bon travail, ordinateur de nouveau opérationnel."),
            ("Imprimante hors",  5, "Très réactif, l'imprimante fonctionne parfaitement."),
            ("Connexion réseau", 4, "Problème résolu, la connexion est maintenant stable."),
            ("Windows Update",   3, "Problème résolu mais cela a pris un peu de temps."),
            ("Clavier défectueux",5,"Remplacement immédiat, service excellent."),
            ("Partage réseau",   4, "Accès rétabli rapidement, merci."),
            ("PC qui surchauffe",5, "Le PC ne surchauffe plus, excellent diagnostic."),
            ("Office ne s'ouvre",4, "Problème résolu rapidement à distance."),
            ("messagerie Outlook",3,"Résolu mais aurait pu être plus rapide."),
            ("Disque dur plein", 5, "Nettoyage efficace, PC beaucoup plus rapide maintenant."),
            ("Écran fissuré",    5, "Écran remplacé parfaitement, comme neuf."),
            ("Panne alimentation",4,"Pièce commandée et remplacée rapidement."),
            ("VPN ne fonctionne",5,"Connexion VPN opérationnelle depuis Ouagadougou."),
            ("Installation ArcGIS",5,"ArcGIS installé et configuré sans problème."),
            ("Souris optique",   5, "Remplacement immédiat, merci."),
            ("Accès refusé",     4, "Droits rétablis, je peux accéder à l'application."),
        ]

        for fragment, rating, comment in ratings:
            t_obj = next(
                (t for t, status in tickets if fragment.lower() in t.title.lower() and status == "resolved"),
                None,
            )
            if not t_obj:
                continue
            if Evaluation.objects.filter(ticket=t_obj).exists():
                continue
            Evaluation.objects.create(ticket=t_obj, rating=rating, comment=comment)
            self.ok(f"Évaluation {rating}/5 — {t_obj.title[:50]}")

    # ─────────────────────────────────────────────────────────────
    def _seed_acquisition_requests(self, users):
        requests_data = [
            (users["user5"],  "Microscope numérique USB",          "Nécessaire pour les analyses d'échantillons minéraux au laboratoire.",                     "approved",  "Validé, achat en cours."),
            (users["user7"],  "Laptop haute performance",           "Pour les travaux de modélisation géologique sur le terrain, besoin d'un portable puissant.","pending",  ""),
            (users["user2"],  "Tablette durcie pour le terrain",    "Pour la saisie des données géologiques directement sur le terrain.",                        "approved",  "Approuvé. Commande BFTECH en cours."),
            (users["user3"],  "Scanner de documents A3",            "Pour la numérisation des archives et documents administratifs volumineuse.",                 "rejected",  "Budget non disponible ce trimestre. Réexaminer en T2."),
            (users["user6"],  "Onduleur 1500 VA",                   "Protection contre les coupures d'électricité fréquentes au bureau d'Ouagadougou.",          "fulfilled", "Livré et installé le 15/04/2026."),
        ]
        for req, eq_type, justif, status, comment in requests_data:
            if AcquisitionRequest.objects.filter(requester=req, equipment_type=eq_type).exists():
                continue
            AcquisitionRequest.objects.create(
                requester=req,
                equipment_type=eq_type,
                justification=justif,
                status=status,
                admin_comment=comment,
            )
            self.ok(f"Demande [{status}] : {eq_type}")

    # ─────────────────────────────────────────────────────────────
    def _seed_contracts(self, equipment_map, suppliers):
        bftech = suppliers.get("BFTECH SARL")
        cyber  = suppliers.get("CyberBF Solutions")
        africa = suppliers.get("Africa IT Group")

        contracts_data = [
            # (name, type, eq_serial, supplier, start_days_ago, end_days, reference, amount, status, notes)
            ("Maintenance serveur principal HP",   "maintenance", "HP-SV-0001", cyber,  730, 365, "MAINT-SV-2025-001", Decimal("1500000"), "active",  "Maintenance préventive annuelle du serveur principal"),
            ("Maintenance serveur backup Dell",    "maintenance", "DL-SV-0001", cyber,  500, 230, "MAINT-SV-2025-002", Decimal("1200000"), "active",  "Maintenance préventive annuelle du serveur backup"),
            ("Support switch Cisco core",          "support",    "CS-SW-0001", africa, 800,-30,  "SUPP-NET-2024-001", Decimal("800000"),  "active",  "Contrat de support Cisco SmartNet"),
            ("Garantie PC DG-01 HP",               "warranty",   "HP-DG-0001", bftech, 730,-365, "GAR-HP-2024-001",  Decimal("0"),       "active",  "Garantie constructeur HP 3 ans"),
            ("Maintenance imprimantes HP",         "maintenance", "HP-PR-0001", bftech, 400, 15,  "MAINT-IMP-2025-001",Decimal("250000"), "active",  "Contrat entretien 2 imprimantes HP — expire bientôt !"),
            ("Maintenance imprimante Canon SI",    "maintenance", "CN-PR-0001", bftech, 365, 10,  "MAINT-IMP-2025-002",Decimal("180000"), "active",  "Entretien Canon imageCLASS — expire dans 10 jours"),
            ("Garantie laptop Lenovo SI-01",       "warranty",   "LN-SI-0001", bftech, 180,-550, "GAR-LN-2024-001",  Decimal("0"),       "active",  "Garantie constructeur Lenovo 3 ans"),
            ("Support réseau annuel ProNet",       "support",    "CS-SW-0002", africa, 800,-200, "SUPP-NET-2024-002", Decimal("600000"), "active",  "Supervision réseau et intervention rapide"),
            ("Contrat leasing laptop OUAGA",      "lease",       "LN-OG-0001", bftech, 280,-600, "LEASE-LT-2023-001",Decimal("950000"), "active",  "Leasing 3 ans laptop direction Ouagadougou"),
            ("Maintenance scanner SG-01",         "maintenance", "EP-SC-0001", bftech, 365,-60,  "MAINT-SC-2025-001",Decimal("120000"), "expired", "Contrat expiré, à renouveler"),
        ]

        contracts = []
        for (name, ctype, eq_serial, supp, start_days_ago,
             end_in_days, ref, amount, status, notes) in contracts_data:
            eq = equipment_map.get(eq_serial)
            if not eq:
                continue
            c, created = Contract.objects.get_or_create(
                reference=ref,
                defaults={
                    "name": name,
                    "type": ctype,
                    "equipment": eq,
                    "supplier": supp,
                    "start_date": date_ago(start_days_ago),
                    "end_date": date_ago(-end_in_days),
                    "alert_days": 30,
                    "amount": amount,
                    "status": status,
                    "notes": notes,
                },
            )
            contracts.append(c)
            if created:
                self.ok(f"Contrat [{status}] : {name}")

        return contracts

    # ─────────────────────────────────────────────────────────────
    def _seed_alerts(self, contracts, equipment_map):
        # Alertes liées aux contrats expirant bientôt (< 30 jours)
        soon = [c for c in contracts if c.end_date and 0 <= (c.end_date - date.today()).days <= 30]
        for c in soon:
            days = (c.end_date - date.today()).days
            msg = f"Le contrat « {c.name} » expire dans {days} jour(s) (le {c.end_date.strftime('%d/%m/%Y')})."
            a, created = Alert.objects.get_or_create(
                contract=c,
                type="contract_expiry",
                defaults={"message": msg, "status": "pending"},
            )
            if created:
                self.ok(f"Alerte : {msg[:70]}")

        # Alerte garantie équipement expirant
        equip_warranty = Equipment.objects.filter(
            warranty_end_date__isnull=False,
            warranty_end_date__gte=date.today(),
            warranty_end_date__lte=date.today() + timedelta(days=60),
        )
        for eq in equip_warranty:
            days = (eq.warranty_end_date - date.today()).days
            msg = f"Garantie de « {eq.name} » expire dans {days} jour(s)."
            a, created = Alert.objects.get_or_create(
                equipment=eq,
                type="warranty_expiry",
                defaults={"message": msg, "status": "pending"},
            )
            if created:
                self.ok(f"Alerte garantie : {eq.name}")
